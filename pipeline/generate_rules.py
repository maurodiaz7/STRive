from mlxtend.frequent_patterns import fpgrowth, association_rules
import pandas as pd
import json
from datetime import datetime

def generateFPGrowth(df, features, dates, min_sup, min_lift):
    # df = df[df['DATE'].isin(pd.to_datetime(dates))]
    grouped = df.groupby([df['DATE'].dt.year, df['DATE'].dt.month])

    rules_list = []
    for key, value in grouped:
        # generate rules only in selected dates
        key = str(key[0]) + '-' + str(key[1]).zfill(2)
        if key not in dates:
            continue
        # print(key, len(value))
        value = value[features]
        value = value.applymap(str)
        df_onehot = pd.get_dummies(value, prefix_sep=':')
        frequent_itemsets = fpgrowth(df_onehot, min_support=min_sup, use_colnames=True)
        rules = association_rules(frequent_itemsets, metric="lift", min_threshold=min_lift)
        rules = rules[["antecedents", "consequents", 'lift', 'support', 'confidence']]
        # print('rules', len(rules))
        for index, row in rules.iterrows():
            antecedents = row['antecedents']
            consequents = row['consequents']
            rules_list.append({
                'antecedents': antecedents,
                'consequents': consequents,
                'lift': row['lift'],
                'support': row['support'],
                'confidence': row['confidence']
            })

    str_rules = []
    for i, rule in enumerate(rules_list):
        antecedents = sorted(rules_list[i]['antecedents'])
        consequents = sorted(rules_list[i]['consequents'])
        str_rules.append(
            (';'.join(antecedents)+'$'+';'.join(consequents), rules_list[i]['lift'], rules_list[i]['support'], rules_list[i]['confidence'])
        )

    print('str initial', len(str_rules))

    rule_means = dict()


    for rule in str_rules:
        if rule[0] not in rule_means:
            rule_means[rule[0]] = dict()
            rule_means[rule[0]]['lift'] = []
            rule_means[rule[0]]['support'] = []
            rule_means[rule[0]]['confidence'] = []

        rule_means[rule[0]]['lift'].append(rule[1])
        rule_means[rule[0]]['support'].append(rule[2])
        rule_means[rule[0]]['confidence'].append(rule[3])

    important_rules = []

    for key, value in rule_means.items():
        important_rules.append(
            (key,
                sum(value['lift'])/len(value['lift']),
                sum(value['support'])/len(value['support']),
                sum(value['confidence'])/len(value['confidence']),
                len(value['lift']))
            )

    # important_rules = sorted(important_rules, key = lambda x:x[1], reverse=True)
    print('STR')
    print(len(str_rules))
    print(len(important_rules))
    final_rules = []

    for x in important_rules:
        str_rule = x[0]
        lift = x[1]
        support = x[2]
        confidence = x[3]
        counts = x[4]
        antecedents, consequents = str_rule.split('$')
        antecedents = antecedents.split(';')
        consequents = consequents.split(';')
        X_col, X_val = [x.split(":")[0] for x in antecedents], [x.split(":")[1] for x in antecedents]
        Y_col, Y_val = [x.split(":")[0] for x in consequents], [x.split(":")[1] for x in consequents]
        final_rules.append({
            'X_col': X_col,
            'X_val': X_val,
            'Y_col': Y_col,
            'Y_val': Y_val,
            'mean_lift': lift,
            'mean_support': support,
            'mean_confidence': confidence,
            'counts': counts
        })

    rules_dict = dict()
    for i, rule in enumerate(final_rules):
        i = str(i)
        rules_dict[i] = dict()
        rules_dict[i]['rule'] = {
            'X_col': rule['X_col'],
            'X_val': rule['X_val'],
            'Y_col': rule['Y_col'],
            'Y_val': rule['Y_val'],
            'mean_lift': rule['mean_lift'],
            'mean_support': rule['mean_support'],
            'mean_confidence': rule['mean_confidence'],
            'counts': rule['counts']
        }

    # print(rules_dict)
    now = datetime.now()
    date_time = now.strftime("%Y-%m-%d_%H-%M-%S")
    filename = 'initial_rules/rules_' + date_time + '.json'
    rules_list = []

    for key, value in rules_dict.items():
        for x in value:
            antecedents = [x+':'+y for x,y in zip(value['rule']['X_col'], value['rule']['X_val'])]
            antecedents = ';'.join(antecedents)
            consequents = [x+':'+y for x,y in zip(value['rule']['Y_col'], value['rule']['Y_val'])]
            consequents = ';'.join(consequents)
            print('rule', x)
            print(antecedents + ' -> ' + consequents)
            rules_list.append((key, antecedents, consequents))

    rules_list.sort(key=lambda x: (x[2], x[1])) # accidents
    # rules_list.sort(key=lambda x: (x[1], x[2])) # crimes
    new_rules = dict()
    for x in rules_list:
        if 'Not Reported' in x[1] or 'Not Reported' in x[2]:
            continue
        else:
            new_rules[x[0]] = rules_dict[x[0]]

    rules_list = [x[1] + ' -> ' + x[2] for x in rules_list]
    # with open(filename, 'w') as f:
    #    json.dump(rules_list, f, indent=2)
    return new_rules

