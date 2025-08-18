import json
import numpy as np

def similarity1(rules_dict, key1, key2):
        X_col = rules_dict[key1]['rule']['X_col']
        X_val = rules_dict[key1]['rule']['X_val']
        Y_col = rules_dict[key1]['rule']['Y_col']
        Y_val = rules_dict[key1]['rule']['Y_val']
        antecedent1 = [str(a) + ':' + str(b) for a,b in zip(X_col,X_val)]
        consequent1 = [str(a) + ':' + str(b) for a,b in zip(Y_col,Y_val)]
        X_col = rules_dict[key2]['rule']['X_col']
        X_val = rules_dict[key2]['rule']['X_val']
        Y_col = rules_dict[key2]['rule']['Y_col']
        Y_val = rules_dict[key2]['rule']['Y_val']
        antecedent2 = [str(a) + ':' + str(b) for a,b in zip(X_col,X_val)]
        consequent2 = [str(a) + ':' + str(b) for a,b in zip(Y_col,Y_val)]
        antecedent1 = set(antecedent1)
        consequent1 = set(consequent1)
        antecedent2 = set(antecedent2)
        consequent2 = set(consequent2)
        int1 = antecedent1.intersection(antecedent2)
        int2 = consequent1.intersection(consequent2)
        un1 = antecedent1.union(antecedent2)
        un2 = consequent1.union(consequent2)

        sim = (len(int1) + len(int2)) / (len(un1) + len(un2))

        return sim

def distances_matrix(rules_dict):
    keys = list(rules_dict.keys())
    n = len(keys)
    distance_matrix = np.zeros((n, n), dtype=np.float32)

    for i in range(n):
        for j in range(i + 1, n):
            distance_matrix[i, j] = 1 - similarity1(rules_dict, keys[i], keys[j])
            distance_matrix[j, i] = distance_matrix[i, j]

    return distance_matrix, keys