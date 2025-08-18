from datetime import datetime
import json

metric = 'mean_lift'

def filter_rules(rules_dict):
    rules_dict2 = dict()

    for key, value in rules_dict.items():
        X_col = value['rule']['X_col']
        X_val = value['rule']['X_val']
        antecedents = [a+':'+b for a, b in zip(X_col, X_val)]
        Y_col = value['rule']['Y_col']
        Y_val = value['rule']['Y_val']
        consequents = [a+':'+b for a, b in zip(Y_col, Y_val)]
        full_key = antecedents + consequents
        full_key = sorted(full_key)	
        full_key = ';'.join(full_key)
        
        if full_key not in rules_dict2:
            rules_dict2[full_key] = []

        rules_dict2[full_key].append((
            key,
            value['rule'][metric]
        ))

    rules_dict3 = dict()
    for key, value in rules_dict2.items():
        sorted_by_metric = sorted(value, key = lambda x:x[1], reverse=True)
        # sorted_by_metric = sorted(value, key = lambda x:x[1], reverse=True)
        top_rule = sorted_by_metric[0][0]
        rules_dict3[top_rule] = rules_dict[top_rule]

    print("TERMINO DEL FILTRO")
    return rules_dict3

