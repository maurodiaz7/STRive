from flask import Flask, request, session, jsonify, render_template
from heapq import nlargest
from collections import defaultdict

import warnings
import os
import uuid
import tempfile
import itertools
import json
import pandas as pd

from pipeline.pipeline import called

from lib import utils

warnings.filterwarnings("ignore")

app = Flask(__name__)
app.secret_key = "secreto"

UPLOAD_DIR = tempfile.gettempdir()

@app.route("/upload_files", methods=["POST"])
def upload_files():
    csv_file = request.files["csv"]
    json_file = request.files["json"]

    # ID for each user
    file_id = str(uuid.uuid4())
    session["file_id"] = file_id

    # Save files to temp folder
    csv_path = os.path.join(UPLOAD_DIR, f"{file_id}.csv")
    json_path = os.path.join(UPLOAD_DIR, f"{file_id}.json")
    
    csv_file.save(csv_path)
    json_file.save(json_path)

    df = pd.read_csv(csv_path)
    columns = df.columns.tolist()
    
    dates = df['DATE'].values.tolist()
    dates = utils.get_unique_months(dates)

    # Save extracted dates
    with open(os.path.join(UPLOAD_DIR, f"{file_id}_dates.json"), "w") as f:
        json.dump(dates, f)

    columns.remove('DATE')
    columns.remove('PLACE')

    return jsonify({"columns": columns, "dates":dates})

def get_ids(data, rule_id, rules_dict):
    X_col = rules_dict[rule_id]["rule"]["X_col"]
    X_val = rules_dict[rule_id]["rule"]["X_val"]
    Y_col = rules_dict[rule_id]["rule"]["Y_col"]
    Y_val = rules_dict[rule_id]["rule"]["Y_val"]
    columns = X_col + Y_col
    values = X_val + Y_val
    for i in range(len(columns)):
        data = data.loc[data[columns[i]] == values[i]]
    data["id"] = pd.to_numeric(data["id"])
    return data["id"].values.tolist()


def get_rules_from_cluster(rule_ids, rules_dict):
    rules = []
    all_antecedent = dict()
    all_consequent = dict()

    for rule_id in rule_ids:        
        X_cols = rules_dict[rule_id]["rule"]["X_col"]
        X_values = rules_dict[rule_id]["rule"]["X_val"]
        Y_cols = rules_dict[rule_id]["rule"]["Y_col"]
        Y_values = rules_dict[rule_id]["rule"]["Y_val"]
        antecedent = [x + ":" + y for x, y in zip(X_cols, X_values)]
        consequent = [x + ":" + y for x, y in zip(Y_cols, Y_values)]
        for pair in antecedent:
            if pair not in all_antecedent:
                all_antecedent[pair] = 0
            all_antecedent[pair] += 1

        for pair in consequent:
            if pair not in all_consequent:
                all_consequent[pair] = 0
            all_consequent[pair] += 1
        antecedent = [x + "$A" for x in antecedent]
        consequent = [x + "$C" for x in consequent]
        count = rules_dict[rule_id]["data"]["rule_counts"]
        rules.append(
            {
                "id": rule_id,
                "antecedent": antecedent,
                "consequent": consequent,
                "count": count,
            }
        )
    return {"rules": rules}

def get_rules_locations_from_cluster(rule_ids, rules_dict, dates):
    rules = []

    for rule_id in rule_ids:
        rule_locations = rules_dict[rule_id]['data']['locations']
        for i, locations in enumerate(rule_locations):
            if len(locations)>0:
                for loc in locations:
                    rules.append(
                        {
                            "id": rule_id,
                            "date": dates[i],
                            "location": loc['location'],
                            "count": loc['val']
                        }
                    )
    return rules


def get_cluster_representation_duplicated(cluster_id, cluster_dict, rules_dict):
    rule_ids = cluster_dict[cluster_id]
    rules = []
    all_antecedent = dict()
    all_consequent = dict()

    for rule_id in rule_ids:
        X_cols = rules_dict[rule_id]["rule"]["X_col"]
        X_values = rules_dict[rule_id]["rule"]["X_val"]
        Y_cols = rules_dict[rule_id]["rule"]["Y_col"]
        Y_values = rules_dict[rule_id]["rule"]["Y_val"]
        antecedent = [x + ":" + y for x, y in zip(X_cols, X_values)]
        consequent = [x + ":" + y for x, y in zip(Y_cols, Y_values)]
        for pair in antecedent:
            if pair not in all_antecedent:
                all_antecedent[pair] = 0
            all_antecedent[pair] += 1

        for pair in consequent:
            if pair not in all_consequent:
                all_consequent[pair] = 0
            all_consequent[pair] += 1

    antecedents = [(key + "$A", value) for key, value in all_antecedent.items()]
    consequents = [(key + "$C", value) for key, value in all_consequent.items()]
    merged = antecedents + consequents
    data_max = max([x[1] for x in merged])

    return {"id": cluster_id, "count": merged, "max": data_max}

def get_cluster_timeline(df, cluster_id, cluster_dict, rules_dict):    
    members = cluster_dict[cluster_id]
    grouped = df.groupby([df["DATE"].dt.year, df["DATE"].dt.month])
    cluster_timeline = []
    for key, value in grouped:
        all_ids = []
        # value = value.astype(str)
        id_list = [get_ids(value, x, rules_dict) for x in members]
        id_list = list(set(item for sublist in id_list for item in sublist))
        date = str(key[0]) + "-" + str(key[1]).zfill(2)
        df2 = df.loc[df["id"].isin(id_list)]
        locations = [
            {"location": x, "count": len(df2.loc[df2['PLACE'] == x]), "ids": df2.loc[df2['PLACE'] == x, "id"].tolist()}
            for x in df2['PLACE'].unique()
        ]
        
        cluster_timeline.append(
            {
                "id": cluster_id,
                "date": date,
                "count": len(id_list),
                "locations": locations,
            }
        )
    return cluster_timeline


def get_scatterplot_data(cluster_id, dates, date1, date2, rules_dict, cluster_dict):
    members = cluster_dict[cluster_id]
    data_dict = dict()
    data_dict["id"] = cluster_id
    data_dict["rules"] = len(members)
    all_support = []
    all_confidence = []
    all_lift = []
    all_occurrences = []
    for member in members:
        idx1 = dates.index(date1)
        idx2 = dates.index(date2) + 1
        all_support += rules_dict[member]["data"]["support"][idx1:idx2]
        all_confidence += rules_dict[member]["data"]["confidence"][idx1:idx2]
        all_lift += rules_dict[member]["data"]["lift"][idx1:idx2]
        all_occurrences += rules_dict[member]["data"]["rule_counts"][idx1:idx2]

    data_dict["min-support"] = round(min(all_support), 3)
    data_dict["max-support"] = round(max(all_support), 3)
    data_dict["mean-support"] = round(sum(all_support) / len(all_support), 3)

    data_dict["min-confidence"] = round(min(all_confidence), 3)
    data_dict["max-confidence"] = round(max(all_confidence), 3)
    data_dict["mean-confidence"] = round(sum(all_confidence) / len(all_confidence), 3)

    data_dict["min-lift"] = round(min(all_lift), 3)
    data_dict["max-lift"] = round(max(all_lift), 3)
    data_dict["mean-lift"] = round(sum(all_lift) / len(all_lift), 3)

    data_dict["min-occurrences"] = round(min(all_occurrences), 3)
    data_dict["max-occurrences"] = round(max(all_occurrences), 3)
    data_dict["mean-occurrences"] = round(sum(all_occurrences) / len(all_occurrences))
    return data_dict


def build_timeline(rule_id, rules_dict, dates):
    rule_timeline = rules_dict[rule_id]['data']['locations']
    final_timeline = []
    for i, timeline in enumerate(rule_timeline):
        date = dates[i]
        for location in timeline:
            final_timeline.append({
                'date': date,
                'location': location['location'],
                'count': location['val']
            })
    return final_timeline


# Send data upon request
@app.route("/get_rule_timeline", methods=["POST"])
def rule_timeline():
    file_id = session.get("file_id")

    with open(os.path.join(UPLOAD_DIR, f"{file_id}_rules_dict.json"), "r") as f:
        rules_dict = json.load(f)
    with open(os.path.join(UPLOAD_DIR, f"{file_id}_dates.json"), "r") as f:
        dates = json.load(f)

    rule_id = request.json.get("id")
    final_timeline = build_timeline(rule_id, rules_dict, dates)
    return final_timeline

@app.route("/explain_llm", methods=["POST"])
def extract_dates_for_llm():
    file_id = session.get("file_id")

    with open(os.path.join(UPLOAD_DIR, f"{file_id}_rules_dict.json"), "r") as f:
        rules_dict = json.load(f)
    with open(os.path.join(UPLOAD_DIR, f"{file_id}_dates.json"), "r") as f:
        dates = json.load(f)

    cumulative_data = {}

    rule_id = request.json.get("id")
    selected_dates = request.json.get("selected_dates", [])
    selectedStateName = request.json.get("selectedStateName", [])

    final_timeline = build_timeline(rule_id, rules_dict, dates)

    if selected_dates:
        final_timeline = [entry for entry in final_timeline if entry["date"] in selected_dates]

    antecedent = [f"{col}-{val}" for col, val in zip(rules_dict[rule_id]['rule']['X_col'], rules_dict[rule_id]['rule']['X_val'])]
    consequent = [f"{col}-{val}" for col, val in zip(rules_dict[rule_id]['rule']['Y_col'], rules_dict[rule_id]['rule']['Y_val'])]

    location_counts = defaultdict(int)
    for entry in final_timeline:
        location_counts[entry["location"]] += entry["count"]

    top_locations = nlargest(3, location_counts.items(), key=lambda x: x[1])
    top_location_names = [loc for loc, _ in top_locations]
    current_filtered_timeline = [entry for entry in final_timeline if entry["location"] in top_location_names]

    rule_key = f"{rule_id}_{'-'.join(antecedent)}_{'-'.join(consequent)}"
    """
    if rule_key not in cumulative_data:
        cumulative_data[rule_key] = {
            "antecedent": antecedent,
            "consequent": consequent,
            "timeline": []
        }

    existing_timeline = cumulative_data[rule_key]["timeline"]

    current_locations = {entry["location"] for entry in current_filtered_timeline}
    existing_locations = {entry["location"] for entry in existing_timeline}
    lost_locations = existing_locations - current_locations
    combined_timeline = { (entry['location'], entry['date']): entry for entry in current_filtered_timeline }
    for entry in existing_timeline:
        if entry["location"] in lost_locations:
            combined_timeline[(entry['location'], entry['date'])] = entry

    final_combined_timeline = list(combined_timeline.values())
    location_order = {loc: idx for idx, loc in enumerate(sorted(set(entry["location"] for entry in final_combined_timeline)))}
    final_combined_timeline.sort(key=lambda x: (location_order[x["location"]], x["date"]))
    cumulative_data[rule_key]["timeline"] = final_combined_timeline
    """
    result = {
        "antecedent": antecedent,
        "consequent": consequent,
        "timeline": current_filtered_timeline # final_combined_timeline
    }

    from pipeline.llm import response_llm 
    #response_openai = request_openai(result)
    response = response_llm(result)
    return response

@app.route("/rules_from_id", methods=["POST"])
def rules_from_id():
    cluster_id = request.json.get("cluster_id")
    file_id = session.get("file_id")

    with open(os.path.join(UPLOAD_DIR, f"{file_id}_cluster_dict.json"), "r") as f:
        cluster_dict = json.load(f)

    with open(os.path.join(UPLOAD_DIR, f"{file_id}_rules_dict.json"), "r") as f:
        rules_dict = json.load(f)

    rule_ids = cluster_dict[cluster_id]

    cluster_data = get_rules_from_cluster(rule_ids, rules_dict)
    return cluster_data

@app.route("/rule_locations_from_id", methods=["POST"])
def rules_locations_from_id():
    file_id = session.get("file_id")

    with open(os.path.join(UPLOAD_DIR, f"{file_id}_cluster_dict.json"), "r") as f:
        cluster_dict = json.load(f)

    with open(os.path.join(UPLOAD_DIR, f"{file_id}_rules_dict.json"), "r") as f:
        rules_dict = json.load(f)

    with open(os.path.join(UPLOAD_DIR, f"{file_id}_dates.json"), "r") as f:
        dates = json.load(f)

    cluster_id = request.json.get("cluster_id")
    rule_ids = cluster_dict[cluster_id]
    cluster_data = get_rules_locations_from_cluster(rule_ids, rules_dict, dates)
    return cluster_data


# Send data upon request
@app.route("/rules_intersections", methods=["POST"])
def rules_intersections():
    rule_ids = request.json.get("rules_selected")
    ids_dict = dict()
    grouped = df.groupby([df["DATE"].dt.year, df["DATE"].dt.month])
    for key, value in grouped:
        value = value.astype(str)
        for x in rule_ids:
            if x not in ids_dict:
                ids_dict[x] = []
            ids = get_ids(value, x)
            ids_dict[x].append(ids)

    result = []
    for i in range(len(dates)):
        intersections = dict()
        all_ids = []
        for rule_id in rule_ids:
            all_ids += ids_dict[rule_id][i]
        all_ids = list(set(all_ids))
        for data_id in all_ids:
            keys = []
            for rule_id in rule_ids:
                if data_id in ids_dict[rule_id][i]:
                    keys.append(rule_id)

            keys = ",".join(keys)
            if keys not in intersections:
                intersections[keys] = []
            intersections[keys].append(data_id)


        for key, value in intersections.items():
            result.append({"sets": key, "count": len(value), "date": dates[i]})
    # get timelines
    timelines = []
    for rule_id in rule_ids:
        occurrences = rules_dict[rule_id]["data"]["rule_counts"]
        occurrences = [
            {"date": dates[i], "value": x} for i, x in enumerate(occurrences)
        ]
        timelines.append(occurrences)
    return {"intersections": result, "timelines": timelines, "ids": rule_ids}


@app.route("/get_clusters", methods=["POST"])
def get_cluster_data():
    features = request.json.get("features")
    days = request.json.get("dates")
    resolution = request.json.get("resolution")
    min_sup = float(request.json.get("min_sup"))
    if min_sup == 0:
        min_sup = 0.01
    min_lift = float(request.json.get("min_lift"))

    # load stored data    
    file_id = session.get("file_id")
    csv_path = os.path.join(UPLOAD_DIR, f"{file_id}.csv")
    json_path = os.path.join(UPLOAD_DIR, f"{file_id}.json")
    df = pd.read_csv(csv_path)
    df = df.astype(str)
    columns = df.columns.tolist()
    dates = df['DATE'].values.tolist()
    dates = utils.get_unique_months(dates)
    df["DATE"] = pd.to_datetime(df["DATE"])

    # add unique id column
    if 'id' not in df.columns:
        df.insert(0, 'id', range(0, len(df)))

    print('CALLED PIPELINE WITH')
    print(features)
    print(days)
    print(min_sup)
    print(min_lift)
    print(resolution)
    # pass date range to function
    new_dates = dates[dates.index(days[0]) : dates.index(days[1]) + 1]
    # new_dates = [dates[0], dates[-1]]
    print(new_dates)
    print(df.columns)

    print('========================================================')
    resolution = float(resolution)

    rules_dict, cluster_dict = called(df, features, new_dates, resolution, min_sup, min_lift)

    # save rules_dict and  cluster_dict to temporary storage
    with open(os.path.join(UPLOAD_DIR, f"{file_id}_cluster_dict.json"), "w") as f:
        json.dump(cluster_dict, f)

    # Save rules_dict
    with open(os.path.join(UPLOAD_DIR, f"{file_id}_rules_dict.json"), "w") as f:
        json.dump(rules_dict, f)
    
    print('========================================================')
    

    cluster_ids = list(cluster_dict.keys())
    cluster_ids = [(x, len(cluster_dict[x])) for x in cluster_ids]
    cluster_ids = sorted(cluster_ids, key=lambda x: x[1])
    csizes = sum([x[1] for x in cluster_ids]) / len(cluster_ids)

    cluster_representations = [
        get_cluster_representation_duplicated(x[0], cluster_dict, rules_dict) for x in cluster_ids
    ]

    # Filter clusters
    final_representations = cluster_representations
    #for cluster_rep in cluster_representations:
    #    cid = cluster_rep["id"]
    #    counts = cluster_rep["count"]
    #    cluster_antecedents = [x[0] for x in counts if x[0][-1] == "A"]
    #    antecedent_flag = False
    #    if not search_ant:
    #        antecedent_flag = True
    #    else:
    #        if all(s in cluster_antecedents for s in search_ant):
    #            antecedent_flag = True
    #    cluster_consequents = [x[0] for x in counts if x[0][-1] == "C"]
    #    consequent_flag = False
    #    if not search_con:
    #        consequent_flag = True
    #    else:
    #        if all(s in cluster_consequents for s in search_con):
    #            consequent_flag = True
    #    append_flag = antecedent_flag and consequent_flag
    #    if append_flag:
    #        final_representations.append(cluster_rep)

    cluster_ids = [x["id"] for x in final_representations]
    cluster_ids = [(x, len(cluster_dict[x])) for x in cluster_ids]
    cluster_representations = final_representations
    cluster_sizes = dict()
    for x in cluster_ids:
        cluster_sizes[x[0]] = x[1]
    cluster_ids = [x[0] for x in cluster_ids]

    all_attributes = [[t[0] for t in x["count"]] for x in cluster_representations]
    all_attributes = list(itertools.chain.from_iterable(all_attributes))
    all_attributes = list(set(all_attributes))
    all_attributes = sorted(all_attributes, key=lambda x: x[-1])
    # order_map = {item: index for index, item in enumerate(list(attributes_map.keys()))}
    # all_attributes = sorted(all_attributes, key=lambda x: order_map[x])

    attributes1 = [x for x in all_attributes if x[-1] == 'A']
    attributes2 = [x for x in all_attributes if x[-1] == 'C']
    attributes1 = sorted(attributes1)
    attributes2 = sorted(attributes2)
    all_attributes = attributes1 + attributes2

    cluster_timeline = []
    cluster_timeline = [get_cluster_timeline(df, x, cluster_dict, rules_dict) for x in cluster_ids]
    cluster_timeline = [item for sublist in cluster_timeline for item in sublist]

    new_dates = dates[dates.index(days[0]) : dates.index(days[1]) + 1]
    cluster_timeline = [x for x in cluster_timeline if x["date"] in new_dates]
    cluster_timeline = [x for x in cluster_timeline if x["id"] in cluster_ids]
    scatterplot_data = [get_scatterplot_data(x, dates, days[0], days[1], rules_dict, cluster_dict) for x in cluster_ids]
    
    return {
        "all_attributes": all_attributes,
        "cluster_ids": cluster_ids,
        "cluster_representations": cluster_representations,
        "cluster_sizes": cluster_sizes,
        "cluster_timeline": cluster_timeline,
        "scatterplot_data": scatterplot_data,
        "dates": new_dates
    }

@app.route("/", methods=["GET"])
def main():
    return render_template("index.html")


if __name__ == "__main__":
    app.run(debug=True, port=8000)