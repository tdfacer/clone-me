import pandas as pd
from typing import List
from pydantic import BaseModel
from openai import OpenAI
import csv
from pathlib import Path
import json
from dotenv import load_dotenv


DATA_DIR = "./data"
INPUT_FILE = f"{DATA_DIR}/input/extended_questionnaire.csv"


class PersonaProfile(BaseModel):
    """Structure for the persona details"""

    name: str
    age: int
    occupation: str
    location: str
    background: str
    personality_traits: List[str]
    life_experiences: List[str]
    values: List[str]


class QAPair(BaseModel):
    """Structure for a question-answer pair with reasoning"""

    Question: str
    Response: str
    Reasoning: str


def generate_random_persona(client: OpenAI) -> PersonaProfile:
    """Generate a random, detailed persona using the OpenAI API."""
    system_prompt = """Generate a random, realistic persona for answering personal questions.
    The persona should be detailed enough to maintain consistent responses across various personal questions.
    Include specific life experiences, values, and personality traits that will influence their answers."""

    completion = client.beta.chat.completions.parse(
        model="gpt-4o-2024-08-06",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Create a detailed random persona."},
        ],
        response_format=PersonaProfile,
    )

    return completion.choices[0].message.parsed


def process_question(client: OpenAI, question: str, persona: PersonaProfile) -> QAPair:
    """Process a single question using the OpenAI API with the defined persona."""
    persona_context = f"""You are responding as {persona.name}, a {persona.age}-year-old {persona.occupation} from {persona.location}.
    Background: {persona.background}
    Personality traits: {', '.join(persona.personality_traits)}
    Key life experiences: {', '.join(persona.life_experiences)}
    Core values: {', '.join(persona.values)}

    Provide answers that are consistent with this persona's background, experiences, and values.
    Include both the response and the reasoning behind it, explaining how the persona's background influences their answer."""

    completion = client.beta.chat.completions.parse(
        model="gpt-4o-2024-08-06",
        messages=[
            {"role": "system", "content": persona_context},
            {"role": "user", "content": question},
        ],
        response_format=QAPair,
    )

    return completion.choices[0].message.parsed


def process_questions(input_file: str, client: OpenAI) -> List[QAPair]:
    """Process all questions from the input CSV file using a consistent persona."""
    # Generate random persona
    print("Generating random persona...")
    persona = generate_random_persona(client)
    snake_case_persona_name = persona.name.lower().replace(" ", "_")

    # Save persona details to a separate file
    persona_file = f"{DATA_DIR}/output/persona_profile_{snake_case_persona_name}.json"
    with open(persona_file, "w", encoding="utf-8") as f:
        json.dump(persona.model_dump(), f, indent=2)

    print("\nGenerated Persona:")
    print(f"Name: {persona.name}")
    print(f"Age: {persona.age}")
    print(f"Occupation: {persona.occupation}")
    print(f"Location: {persona.location}")
    print(f"Background: {persona.background}")
    print("\n")

    # Read the input CSV
    df = pd.read_csv(input_file)

    # Prepare the output CSV with headers
    output_file = f"{DATA_DIR}/output/qa_output_{snake_case_persona_name}.csv"

    # Configure CSV writer to handle quoting properly
    with open(output_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(
            f,
            quoting=csv.QUOTE_ALL,  # Quote all fields
            escapechar="\\",  # Use backslash as escape character
            doublequote=True,  # Double-quote characters are escaped by doubling
        )
        writer.writerow(["Category", "Question", "Response", "Reasoning", "Persona"])

    all_qa_pairs = []
    total_questions = len(df)

    for index, row in df.iterrows():
        try:
            print(f"\nProcessing question {index + 1}/{total_questions}")
            print(f"Question: {row['Question']}")

            qa_pair = process_question(client, row["Question"], persona)

            # Write the result immediately to CSV
            with open(output_file, "a", newline="", encoding="utf-8") as f:
                writer = csv.writer(
                    f, quoting=csv.QUOTE_ALL, escapechar="\\", doublequote=True
                )
                writer.writerow(
                    [
                        row["Category"],  # No manual quotes needed
                        qa_pair.Question,
                        qa_pair.Response,
                        qa_pair.Reasoning,
                        persona.name,  # No manual quotes needed
                    ]
                )

            all_qa_pairs.append(qa_pair)
            print(f"✓ Processed and saved response for question {index + 1}")

        except Exception as e:
            print(f"Error processing question {index + 1}: {e}")
            # Write error to CSV
            with open(output_file, "a", newline="", encoding="utf-8") as f:
                writer = csv.writer(
                    f, quoting=csv.QUOTE_ALL, escapechar="\\", doublequote=True
                )
                writer.writerow(
                    [
                        row["Category"],
                        row["Question"],
                        f"ERROR: {str(e)}",
                        "",
                        persona.name,
                    ]
                )

    return all_qa_pairs


def main():
    load_dotenv()

    # Configuration
    input_file = INPUT_FILE
    client = OpenAI()

    if not Path(input_file).exists():
        print(f"Error: Input file '{input_file}' not found")
        return

    print(f"Starting to process questions from {input_file}")
    qa_pairs = process_questions(input_file, client)

    print(f"\nProcessing complete!")
    print(f"Total Q&A pairs generated: {len(qa_pairs)}")
    print(f"Results saved in the {DATA_DIR}/output directory")


if __name__ == "__main__":
    main()
