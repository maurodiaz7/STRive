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

Two test datasets (vehicular accidents and crimes) are provided [here](https://drive.google.com/drive/folders/1GnhVkzpTU-wVA0MJBOqqkrxFNejXr8pT?usp=sharing). These datasets were used to carry out the case studies described in the paper.  Each folder contains two files, one CSV and one JSON. For each dataset, both files are required in order to replicate the results. Please read the attached paper (`article/STRive_.pdf`) for full details.

## First case study - vehicular accidents
The first case study employs the files in the `accidents` folder. Upon downloading them, follow this steps:

1. Launch the tool and go to http://127.0.0.1:8000/.
2. In the **Control Panel** component, upload the CSV file `accidents/data.csv` using the top file input field.
3. In the **Control Panel** component, upload the JSON file `accidents/mapdata.json` using the bottom file input field.
4. Click on the **Upload** button.
5. The **Control Panel** will display the available attributes, range sliders for the filtering metrics and clustering parameter. For this case study, the following configuration options were used:
   - Attributes: `LitCond`, `Weather` and `Drunk`.
   - Thresholds: Min sup: `0.5`, Min lift: `1.05`, Res: `1.0`.
   - Dates: `2016-01` to `2022-12`.
   The tool uses these configuration options as defaults, except for the attributes. Select the specified attributes and click on **Filter**.
6. The tool will process the data to generate rules and clusters. Once processing is complete, the views will automatically update to display the results.

## Second case study - crimes
The second case study employs the files in the `crimes` folder. Upon downloading them, follow this steps:

**Note**: During the experiments, we tested several rule orderings, including sorting by antecedents and by consequents. For this second case study, the rules are sorted by antecedent. To reproduce the results from the paper, open `pipeline/generate_rules.py`, comment out line 129, and uncomment line 130. If this is not done, the results will be mostly the same, but with antecedents and consequents reversed (e.g., `Type:Theft -> Location:Park Property` instead of `Location:Park Property -> Type:Theft`). We recommend making this small change.

1. Launch the tool and go to http://127.0.0.1:8000/.
2. In the **Control Panel** component, upload the CSV file `crimes/data.csv` using the top file input field.
3. In the **Control Panel** component, upload the JSON file `crimes/mapdata.json` using the bottom file input field.
4. Click on the **Upload** button.
5. The **Control Panel** will display the available attributes, range sliders for the filtering metrics and clustering parameter. For this case study, the following configuration options were used:
   - Attributes: `Type`, `Location` and `Time`.
   - Thresholds: Min sup: `0.1`, Min lift: `1.5`, Res: `2.5`.
   - Dates: `2016-01` to `2019-12`.
   Configure the tool with these options and click on **Filter**. Because this dataset is larger, processing will take longer than in the first case study.
6. The tool will process the data to generate rules and clusters. Once processing is complete, the views will automatically update to display the results.

## Notes
The order of rules and clusters (top to bottom) may differ from what is shown in the paper due to the layout reordering algorithm. Some clusters (mainly the smaller ones) may show slight variations in their composition. Larger clusters, which are the focus of these case studies, remain unchanged. We also implemented a tooltip in the **Attributes** view that appears when hovering over any attribute name, providing better visibility of the attribute.

## Testing other datasets
STRive supports uploading other categorical spatiotemporal datasets. For details on the required input format, see Section 4.3 (Workflow) of the attached paper. You can also use the provided datasets (crimes and accidents) as references for structuring your own input files.

## Contact
If you encounter an error or have any questions, please feel free to contact me at dany.mauro.diaz.e@gmail.com or dany.espino@fgv.br
