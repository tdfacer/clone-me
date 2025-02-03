import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Square,
  Download,
  Upload,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import Papa from "papaparse";

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const PREDEFINED_SETS = [
  {
    id: "personal",
    name: "Personal Questionnaire",
    filename: "personal_questionnaire.csv",
  },
  {
    id: "professional",
    name: "Extended Personal Questionnaire",
    filename: "extended_personal_questionnaire.csv",
  },
];

const STORAGE_KEY = "voice-questionnaire-state";

type Question = {
  Category: string;
  Question: string;
};

type ResponseType = {
  Question: string;
  Reasoning: string;
  Response: string;
};

type RecordingState = "inactive" | "recording-reasoning" | "recording-answer";

const VoiceQuestionnaire = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [responses, setResponses] = useState<ResponseType[]>([]);
  const [recognition, setRecognition] = useState<any>(null);
  const [recordingState, setRecordingState] =
    useState<RecordingState>("inactive");
  const [currentTranscript, setCurrentTranscript] = useState<string>("");
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSet, setSelectedSet] = useState<string>("");
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Separate refs for reasoning and answer textareas
  const reasoningRef = useRef<HTMLTextAreaElement>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);

  // Use a ref to store the transcript for the current recording session.
  const recordingTranscriptRef = useRef<string>("");

  // Compute currentQuestion from questions and currentQuestionIndex
  const currentQuestion = questions[currentQuestionIndex];

  // Load saved state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      const parsed = JSON.parse(savedState);
      setQuestions(parsed.questions);
      setCurrentQuestionIndex(parsed.currentQuestionIndex);
      setResponses(parsed.responses);
      setSelectedSet(parsed.selectedSet);
      // When restoring a file, we don't actually reconstruct a File object,
      // so we simply store its name.
      setSelectedFile(new File([], parsed.fileName));
      if (parsed.currentQuestionIndex > 0) {
        setIsStarted(true);
      }
    }
  }, []);

  useEffect(() => {
    console.log("Current state:", {
      recordingState,
      currentTranscript,
      currentResponse: responses.find(
        (r) => r.Question === currentQuestion?.Question,
      ),
    });
  }, [recordingState, currentTranscript, responses, currentQuestion]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (questions.length && selectedFile) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          questions,
          currentQuestionIndex,
          responses,
          selectedSet,
          fileName: selectedFile.name,
          // Not storing file content for simplicity.
        }),
      );
    }
  }, [questions, currentQuestionIndex, responses, selectedSet, selectedFile]);

  const resetCurrentQuestion = () => {
    setResponses((prev) =>
      prev.filter((r) => r.Question !== currentQuestion.Question),
    );
    setCurrentTranscript("");
    setError("");
  };

  const resetAllResponses = () => {
    if (
      window.confirm(
        "Are you sure you want to reset all responses? This cannot be undone.",
      )
    ) {
      setResponses([]);
      setCurrentQuestionIndex(0);
      setCurrentTranscript("");
      setError("");
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const loadPredefinedQuestions = async (filename: string) => {
    try {
      const response = await fetch(filename);
      const text = await response.text();

      Papa.parse(text, {
        header: true,
        complete: (results) => {
          setPreviewQuestions(results.data as Question[]);
          setQuestions(results.data as Question[]);
          setSelectedFile(new File([text], filename, { type: "text/csv" }));
          setShowPreview(true);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: (error: any) => {
          setError(`Failed to parse CSV: ${error}`);
        },
      });
    } catch (error) {
      setError(`Failed to load question set: ${error}`);
    }
  };

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognitionInstance = new SpeechRecognition();
          recognitionInstance.continuous = true;
          recognitionInstance.interimResults = true;
          recognitionInstance.lang = "en-US";

          recognitionInstance.onstart = () => {
            console.log("Speech recognition started");
            setError("");
          };

          recognitionInstance.onend = () => {
            console.log("Speech recognition ended");
            // Auto-restart if still recording
            if (recordingState !== "inactive") {
              try {
                recognitionInstance.start();
              } catch (err) {
                console.error("Failed to restart recognition:", err);
              }
            }
          };

          recognitionInstance.onresult = (event: any) => {
            let interimTranscript = "";
            // Process the results from the current event.
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const result = event.results[i];
              if (result.isFinal) {
                recordingTranscriptRef.current += result[0].transcript;
              } else {
                interimTranscript += result[0].transcript;
              }
            }
            // Combine the accumulated final transcript with the interim text.
            const updatedTranscript = (
              recordingTranscriptRef.current +
              " " +
              interimTranscript
            ).trim();
            console.log("Updated transcript:", updatedTranscript);
            setCurrentTranscript(updatedTranscript);
          };

          recognitionInstance.onerror = (event: any) => {
            console.error("Speech recognition error:", event.error);
            setError(`Speech recognition error: ${event.error}`);
            setRecordingState("inactive");
          };

          setRecognition(recognitionInstance);
        } catch (err) {
          console.error("Failed to initialize speech recognition:", err);
          setError("Failed to initialize speech recognition");
        }
      } else {
        setError(
          "Speech recognition is not supported in this browser. Please use Chrome or Edge.",
        );
      }
    }
  }, []); // Empty dependency array

  // Start recording for either reasoning or answer.
  const startRecording = (type: "reasoning" | "answer") => {
    console.log("Starting recording:", type);
    if (!recognition) {
      setError("Speech recognition is not initialized");
      return;
    }

    try {
      // Reset the transcript for the new recording session.
      recordingTranscriptRef.current = "";
      setCurrentTranscript("");
      setRecordingState(
        type === "reasoning" ? "recording-reasoning" : "recording-answer",
      );
      recognition.start();
      console.log("Recording started, state:", type);
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError("Failed to start recording. Please try again.");
      setRecordingState("inactive");
    }
  };

  // Stop recording and update the corresponding response field.
  const stopRecording = () => {
    console.log("Stopping recording, current state:", recordingState);
    if (!recognition) return;

    try {
      recognition.stop();
      const currentQuestionText = questions[currentQuestionIndex].Question;
      console.log("Current transcript on stop:", currentTranscript);

      if (recordingState === "recording-reasoning") {
        updateResponse(
          currentQuestionText,
          "Reasoning",
          currentTranscript.trim(),
        );
      } else if (recordingState === "recording-answer") {
        updateResponse(
          currentQuestionText,
          "Response",
          currentTranscript.trim(),
        );
      }

      setRecordingState("inactive");
      setCurrentTranscript("");
    } catch (err) {
      console.error("Failed to stop recording:", err);
      setError("Failed to stop recording");
    }
  };

  // Handle file uploads for custom CSV questions.
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        Papa.parse(text, {
          header: true,
          complete: (results) => {
            const firstRow = results.data[0];
            // Check if the parsed data contains the required columns
            if (
              typeof firstRow === "object" &&
              firstRow !== null &&
              "Category" in firstRow &&
              "Question" in firstRow
            ) {
              setQuestions(results.data as Question[]);
            } else {
              setError(
                'CSV file must contain "Category" and "Question" columns.',
              );
            }
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          error: (error: any) => {
            setError(`Failed to parse CSV: ${error.message}`);
          },
        });
      };
      reader.readAsText(file);
    }
  };

  // Update the response in state for the given question and field.
  const updateResponse = (
    question: string,
    field: "Reasoning" | "Response",
    value: string,
  ) => {
    console.log("Updating response:", { question, field, value });

    setResponses((prev) => {
      const existingIndex = prev.findIndex((r) => r.Question === question);
      let newResponses;

      if (existingIndex >= 0) {
        newResponses = [...prev];
        newResponses[existingIndex] = {
          ...newResponses[existingIndex],
          [field]: value,
        };
      } else {
        newResponses = [
          ...prev,
          {
            Question: question,
            Reasoning: field === "Reasoning" ? value : "",
            Response: field === "Response" ? value : "",
          },
        ];
      }
      console.log("New responses:", newResponses);
      return newResponses;
    });
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setCurrentTranscript("");
      setError("");
    }
  };

  const downloadCSV = () => {
    try {
      const csv = Papa.unparse(responses, {
        quotes: true,
        quoteChar: '"',
        escapeChar: '"',
        delimiter: ",",
        header: true,
        newline: "\n",
      });

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `questionnaire_responses_${
        selectedFile?.name || "default"
      }.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to download CSV");
    }
  };

  // Render the question set selection screen if not started
  if (!isStarted || !selectedFile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6">Question Set Selection</h2>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Predefined Sets */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">
              Choose a Question Set
            </h3>
            <div className="space-y-3">
              {PREDEFINED_SETS.map((set) => (
                <div key={set.id} className="space-y-2">
                  <button
                    onClick={() => {
                      setSelectedSet(set.id);
                      loadPredefinedQuestions(set.filename);
                    }}
                    className={`w-full px-4 py-3 text-left rounded-lg border-2 transition-colors ${
                      selectedSet === set.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{set.name}</span>
                      {selectedSet === set.id && showPreview ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {selectedSet === set.id && showPreview && (
                    <div className="ml-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">Preview Questions:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {previewQuestions.slice(0, 3).map((q, idx) => (
                          <li key={idx} className="text-sm text-gray-600">
                            {q.Question}
                          </li>
                        ))}
                      </ul>
                      {previewQuestions.length > 3 && (
                        <p className="text-sm text-gray-500 mt-2">
                          + {previewQuestions.length - 3} more questions
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Custom Upload */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">
              Upload Custom Questions
            </h3>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-gray-500" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or
                    drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    CSV file with Category,Question columns
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".csv"
                  onChange={(e) => {
                    setSelectedSet("custom");
                    handleFileUpload(e);
                    setIsStarted(true);
                  }}
                />
              </label>
            </div>
          </div>

          {selectedFile && (
            <div className="space-y-4">
              <button
                onClick={() => setIsStarted(true)}
                className="w-full px-6 py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Start Questionnaire
              </button>

              {responses.length > 0 && (
                <button
                  onClick={() => {
                    localStorage.removeItem(STORAGE_KEY);
                    window.location.reload();
                  }}
                  className="w-full px-6 py-3 text-lg font-semibold text-red-600 bg-white border-2 border-red-600 rounded-lg hover:bg-red-50"
                >
                  Clear Saved Progress & Start Fresh
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentResponse = responses.find(
    (r) => r.Question === currentQuestion.Question,
  );

  // Determine whether we are on the final question and if its answer has been provided.
  const isComplete =
    currentQuestionIndex === questions.length - 1 && currentResponse?.Response;

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-100 p-8">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="mb-4">
          <span className="text-sm text-gray-500">
            Category: {currentQuestion.Category}
          </span>
        </div>

        <h2 className="text-2xl font-bold mb-6">
          Question {currentQuestionIndex + 1} of {questions.length}
        </h2>

        <div className="mb-8">
          <p className="text-lg mb-4">{currentQuestion.Question}</p>

          {/* Reasoning Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Your Reasoning:</h3>
            <div className="mb-2">
              {recordingState === "recording-reasoning" ? (
                <button
                  onClick={stopRecording}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  <Square className="w-4 h-4 mr-2" /> Stop Recording
                </button>
              ) : (
                <button
                  onClick={() => startRecording("reasoning")}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={recordingState !== "inactive"}
                >
                  <Mic className="w-4 h-4 mr-2" /> Record Reasoning
                </button>
              )}
            </div>
            <textarea
              ref={reasoningRef}
              className="w-full h-32 p-4 bg-gray-50 rounded border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={
                recordingState === "recording-reasoning"
                  ? currentTranscript
                  : currentResponse?.Reasoning || ""
              }
              onChange={(e) =>
                updateResponse(
                  currentQuestion.Question,
                  "Reasoning",
                  e.target.value,
                )
              }
              placeholder="Type or record your reasoning..."
            />
          </div>

          {/* Answer Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Your Answer:</h3>
            <div className="mb-2">
              {recordingState === "recording-answer" ? (
                <button
                  onClick={stopRecording}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  <Square className="w-4 h-4 mr-2" /> Stop Recording
                </button>
              ) : (
                <button
                  onClick={() => startRecording("answer")}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={recordingState !== "inactive"}
                >
                  <Mic className="w-4 h-4 mr-2" /> Record Answer
                </button>
              )}
            </div>
            <textarea
              ref={answerRef}
              className="w-full h-32 p-4 bg-gray-50 rounded border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={
                recordingState === "recording-answer"
                  ? currentTranscript
                  : currentResponse?.Response || ""
              }
              onChange={(e) =>
                updateResponse(
                  currentQuestion.Question,
                  "Response",
                  e.target.value,
                )
              }
              placeholder="Type or record your answer..."
            />
          </div>
        </div>

        <div className="space-y-6">
          {/* Next/Download buttons at the top */}
          <div className="flex justify-between">
            <button
              onClick={nextQuestion}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              disabled={!currentResponse?.Response && !isComplete}
            >
              Next Question
            </button>
            <button
              onClick={downloadCSV}
              className="flex items-center px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <Download className="w-4 h-4 mr-2" /> Download Responses
            </button>
          </div>

          {/* Reset buttons at the bottom */}
          <div className="flex justify-start items-center border-t pt-4">
            <div className="space-x-4">
              <button
                onClick={resetCurrentQuestion}
                className="px-4 py-2 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50"
                disabled={recordingState !== "inactive"}
              >
                Reset Current Question
              </button>
              <button
                onClick={resetAllResponses}
                className="px-4 py-2 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50"
                disabled={recordingState !== "inactive"}
              >
                Reset All Responses
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceQuestionnaire;
