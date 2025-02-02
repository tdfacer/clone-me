import React, { useState, useEffect } from "react";
import { Mic, Square, Download } from "lucide-react";
import Papa from "papaparse";

// Add TypeScript types for the Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

type Question = {
  Question: string;
  Complex_CoT: string;
  Response: string;
};

type RecordingState = "inactive" | "recording-reasoning" | "recording-answer";

const VoiceQuestionnaire = () => {
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [responses, setResponses] = useState<Question[]>([]);
  const [recognition, setRecognition] = useState<any>(null);
  const [recordingState, setRecordingState] =
    useState<RecordingState>("inactive");
  const [currentTranscript, setCurrentTranscript] = useState<string>("");
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string>("");

  // Initialize speech recognition
  useEffect(() => {
    // Check for browser support
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognitionInstance = new SpeechRecognition();
          recognitionInstance.continuous = true;
          recognitionInstance.interimResults = true;

          recognitionInstance.onresult = (event: any) => {
            let transcript = "";
            for (let i = 0; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript;
            }
            setCurrentTranscript(transcript);
          };

          recognitionInstance.onerror = (event: any) => {
            setError(`Speech recognition error: ${event.error}`);
            setRecordingState("inactive");
          };

          recognitionInstance.onend = () => {
            if (recordingState !== "inactive") {
              recognitionInstance.start();
            }
          };

          setRecognition(recognitionInstance);
          setError("");
        } catch (err) {
          setError("Failed to initialize speech recognition");
        }
      } else {
        setError(
          "Speech recognition is not supported in this browser. Please use Chrome or Edge.",
        );
      }
    }
  }, []);

  // Load sample questions
  useEffect(() => {
    const sampleQuestions = [
      "What is your favorite color and why?",
      "Describe a challenging situation you've faced recently.",
      "What are your thoughts on artificial intelligence?",
    ];
    setQuestions(sampleQuestions);
  }, []);

  const startRecording = (type: "reasoning" | "answer") => {
    if (!recognition) {
      setError("Speech recognition is not initialized");
      return;
    }

    try {
      setCurrentTranscript("");
      setRecordingState(
        type === "reasoning" ? "recording-reasoning" : "recording-answer",
      );
      recognition.start();
      setError("");
    } catch (err) {
      setError("Failed to start recording");
      setRecordingState("inactive");
    }
  };

  const stopRecording = () => {
    if (!recognition) return;

    try {
      recognition.stop();
      const currentQuestion = questions[currentQuestionIndex];

      if (recordingState === "recording-reasoning") {
        setResponses((prev) => [
          ...prev.filter((r) => r.Question !== currentQuestion),
          {
            Question: currentQuestion,
            Complex_CoT: currentTranscript,
            Response: "",
          },
        ]);
      } else if (recordingState === "recording-answer") {
        setResponses((prev) => [
          ...prev.filter((r) => r.Question !== currentQuestion),
          {
            Question: currentQuestion,
            Complex_CoT:
              prev.find((r) => r.Question === currentQuestion)?.Complex_CoT ||
              "",
            Response: currentTranscript,
          },
        ]);
      }

      setRecordingState("inactive");
      setError("");
    } catch (err) {
      setError("Failed to stop recording");
    }
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
      const csv = Papa.unparse(responses);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "questionnaire_responses.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to download CSV");
    }
  };

  if (!isStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <button
          onClick={() => setIsStarted(true)}
          className="px-6 py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Start Questionnaire
        </button>
      </div>
    );
  }

  const isComplete =
    currentQuestionIndex === questions.length - 1 &&
    responses[currentQuestionIndex]?.Response;

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-100 p-8">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <h2 className="text-2xl font-bold mb-6">
          Question {currentQuestionIndex + 1} of {questions.length}
        </h2>

        <div className="mb-8">
          <p className="text-lg mb-4">{questions[currentQuestionIndex]}</p>

          {/* Reasoning Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Your Reasoning:</h3>
            <div className="mb-2">
              {recordingState === "recording-reasoning" ? (
                <button
                  onClick={() => stopRecording()}
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
            <div className="bg-gray-50 p-4 rounded">
              {responses[currentQuestionIndex]?.Complex_CoT ||
                currentTranscript ||
                "No reasoning recorded yet"}
            </div>
          </div>

          {/* Answer Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Your Answer:</h3>
            <div className="mb-2">
              {recordingState === "recording-answer" ? (
                <button
                  onClick={() => stopRecording()}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  <Square className="w-4 h-4 mr-2" /> Stop Recording
                </button>
              ) : (
                <button
                  onClick={() => startRecording("answer")}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={
                    recordingState !== "inactive" ||
                    !responses[currentQuestionIndex]?.Complex_CoT
                  }
                >
                  <Mic className="w-4 h-4 mr-2" /> Record Answer
                </button>
              )}
            </div>
            <div className="bg-gray-50 p-4 rounded">
              {responses[currentQuestionIndex]?.Response ||
                currentTranscript ||
                "No answer recorded yet"}
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          {!isComplete ? (
            <button
              onClick={nextQuestion}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              disabled={!responses[currentQuestionIndex]?.Response}
            >
              Next Question
            </button>
          ) : (
            <button
              onClick={downloadCSV}
              className="flex items-center px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <Download className="w-4 h-4 mr-2" /> Download Responses
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceQuestionnaire;
