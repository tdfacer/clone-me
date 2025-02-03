from datasets import load_dataset
import argparse
from pathlib import Path
import sys
import pandas as pd

"""
Example usage:
python upload_dataset_to_hub.py "./data/output/qa_output_laura_mitchell.csv" tdfacer/clone_me_generated_sample
"""

def validate_csv(file_path: str) -> bool:
    """
    Validate that the CSV file exists and has the expected format.
    Returns True if valid, False otherwise.
    """
    try:
        # Check if file exists
        if not Path(file_path).exists():
            print(f"Error: File '{file_path}' not found")
            return False

        # Try to read the CSV and check required columns
        df = pd.read_csv(file_path)
        required_columns = {"Category", "Question", "Response", "Reasoning", "Persona"}
        missing_columns = required_columns - set(df.columns)

        if missing_columns:
            print(f"Error: Missing required columns: {', '.join(missing_columns)}")
            return False

        # Check for empty files
        if len(df) == 0:
            print("Error: CSV file is empty")
            return False

        return True

    except pd.errors.EmptyDataError:
        print("Error: CSV file is empty")
        return False
    except pd.errors.ParserError:
        print("Error: Invalid CSV format")
        return False
    except Exception as e:
        print(f"Error validating CSV: {str(e)}")
        return False


def upload_dataset(file_path: str, dataset_name: str, private: bool = False) -> bool:
    """
    Upload the dataset to Hugging Face Hub.
    Returns True if successful, False otherwise.
    """
    try:
        print(f"Loading dataset from {file_path}...")
        dataset = load_dataset("csv", data_files=file_path)

        print(f"Uploading dataset to {dataset_name}...")
        dataset.push_to_hub(
            dataset_name,
            private=private,
        )

        print("Dataset successfully uploaded!")
        print(f"View your dataset at: https://huggingface.co/datasets/{dataset_name}")
        return True

    except Exception as e:
        print(f"Error uploading dataset: {str(e)}")
        return False


def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(
        description="Upload a CSV dataset to the Hugging Face Hub"
    )
    parser.add_argument("file_path", type=str, help="Path to the CSV file to upload")
    parser.add_argument(
        "dataset_name",
        type=str,
        help="Name for the dataset on Hugging Face Hub (format: username/dataset_name)",
    )
    parser.add_argument(
        "--private",
        action="store_true",
        help="Make the dataset private (default: public)",
    )

    # Parse arguments
    args = parser.parse_args()
    print(args.file_path)

    # Validate dataset name format
    if "/" not in args.dataset_name:
        print("Error: Dataset name must be in format 'username/dataset_name'")
        sys.exit(1)

    # Validate the CSV file
    print("Validating CSV file...")
    if not validate_csv(args.file_path):
        sys.exit(1)

    # Upload the dataset
    if not upload_dataset(args.file_path, args.dataset_name, args.private):
        sys.exit(1)


if __name__ == "__main__":
    main()
