# STRive: An association rule-based system for the exploration of spatiotemporal categorical data

**STRive** (SpatioTemporal Rule Interactive Visual Explorer) is a visual analytics tool for discovering and exploring spatial and temporal patterns in data. It integrates Association Rule Mining (ARM) with interactive visualization techniques to generate, analyze, and interpret spatiotemporal relationships for actionable insights.

## How to Run

1. **Clone the repository**

```bash
git clone https://github.com/maurodiaz7/STRive.git
cd STRive
```

2. **Install dependencies**

Our tests were carried using Python 3.13.2. 

```bash
 pip install -r requirements/requirements.in
```

3. **Input your credentials (optional)**

STRive includes an LLM (`gemini-2.0-flash`) component for generating explanations of the identified patterns. Input your api key in the file `pipeline/llm.py`, line 136. The LLM explanation component is the last step in the workflow, so it will not interfere with the regular usage of the tool.

4. **Run**

Run with 
```bash
 python .\main.py
```

Go to http://127.0.0.1:8000/ on your browser. We recommend using Google Chrome.

## Download test data

Two test datasets (vehicular accidents and crimes) are provided [https://drive.google.com/drive/folders/1GnhVkzpTU-wVA0MJBOqqkrxFNejXr8pT?usp=sharing](here). These datasets were used to carry out the case studies described in the paper (`article/STRive_.pdf`).  Each folder contains two files, one CSV and one JSON. For each dataset, both files are required in order to replicate the results.


