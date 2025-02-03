# Clone Me 🧑

## Quickstart 🚀

Clone Me makes it easy to create a personal AI clone by fine-tuning the DeepSeek-R1-Distill-Llama-8B model using the Unsloth library. Follow these steps to get started:

### Step 1: Choose Your Dataset
1. **Use Sample Data** (Quickstart):
   - Sample data has already been generated for you and is ready to use.
   - Jump directly into the [notebook](./python/notebooks) and start training.
2. **Create Your Own Dataset**:
   - Head to the [Clone Me Website](https://clone-me-peach.vercel.app/) to:
     - Answer pre-built questions.
     - Upload your custom questions in CSV format.
     - Generate training data for your AI clone.

### Step 2: Environment Setup
1. Ensure you have access to a GPU environment (Google Colab recommended).
2. Set up your Hugging Face account and API token.
3. (Optional) Create a Weights & Biases account for monitoring training metrics.

### Step 3: Fine-Tune the Model

<a target="_blank" href="https://colab.research.google.com/github/tdfacer/clone-me/blob/main/python/notebooks/clone_me.ipynb">
  <img src="https://colab.research.google.com/assets/colab-badge.svg" alt="Open In Colab"/>
</a>

1. Open the Jupyter notebook in `./python/notebooks`.
2. Load your dataset (sample or custom).
3. Follow the instructions in the notebook to fine-tune the model.

---

## Overview

Personal AI Clone Creation using DeepSeek and Unsloth

This project demonstrates how to fine-tune the DeepSeek-R1-Distill-Llama-8B model using the Unsloth library. The model is optimized for faster, lightweight training and inference, making it a great candidate for experimentation on systems with minimal resources (like Colab). The training uses Complex CoT (Chain of Thought) reasoning and personal data to fine-tune the model for personalized outputs.

### Key Features

- **Model Distillation**: The model is based on distillation from Llama architecture. Basically, take the advanced reasoning from DeepSeek-R1 and integrate it into the efficient Llama model.
- **4-bit Quantization**: Efficient resource usage with minimal loss in performance.
- **Integration with Weights & Biases**: Monitor training metrics in real time.

### Requirements

- A GPU environment (Google Colab recommended).
- Hugging Face account with API token.
- Weights & Biases account (optional, for training metrics).
- Personal Q&A dataset in CSV format with columns: `Question`, `Complex_CoT`, `Response`.

You have a couple of options for datasets:
1. Use a sample dataset generated from this script.
2. Use the [Clone Me Website](https://clone-me-peach.vercel.app/) to build out a dataset for yourself!

---

## Important❗

This project requires training data. To clone yourself:
- Visit the [Clone Me Website](https://clone-me-peach.vercel.app/) to create your dataset.
- Alternatively, use the pre-generated sample dataset loaded into this repository or on Hugging Face for convenience.

---

## Project Structure


#### Frontend: Clone Me Web App

- **Location**: `./frontend/clone-me` (or hosted at [clone-me-peach.vercel.app/](https://clone-me-peach.vercel.app/))
- **Description**: A Vite/React project for building training datasets via a web interface.
- **Features**:
  - Custom question upload.
  - Voice-to-text input.
  - Export responses as CSV.

#### Backend: Python Scripts

- **Location**: `./python`
- **Description**: Core Python scripts and resources for LLM fine-tuning, dataset generation, and uploading datasets.

  - **Notebooks**: Jupyter notebooks demonstrating fine-tuning an LLM (e.g., DeepSeek-R1 distilled on Llama 8B).
  - **Data**: Example question datasets and generated training data.
  - **Scripts**:
    - `clone_me_qa_generator.py`: Generates a user persona and answers training questions using an LLM.
    - `upload_dataset_to_hub.py`: Uploads datasets to the Hugging Face Hub.

---

# Development Workflow

1. **Frontend**
   - Navigate to `./frontend/clone-me`.
   - Run `npm install` and `npm start` to launch the development server.

2. **Python Scripts**
   - Set up your Python environment in `./python`.
   - Use the provided scripts to generate datasets or upload them to Hugging Face.

3. **Fine-Tuning**
   - Follow the instructions in the Jupyter notebook to fine-tune the model.

---

# Contribution

Contributions are welcome! Feel free to open issues or submit pull requests to improve the project.
