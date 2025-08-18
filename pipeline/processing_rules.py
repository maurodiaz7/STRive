import pandas as pd
import json

def process_rules(df, dates, rules_list):
	rules_dict = dict()
	keys = list(rules_list.keys())
	
	for i, rule in enumerate(rules_list):
		rules_dict[keys[i]] = dict()
		rules_dict[keys[i]]['rule'] = dict()
		rules_dict[keys[i]]['data'] = dict()
		rules_dict[keys[i]]['data']['support'] = []
		rules_dict[keys[i]]['data']['confidence'] = []
		rules_dict[keys[i]]['data']['lift'] = []
		rules_dict[keys[i]]['data']['locations'] = []
		rules_dict[keys[i]]['data']['rule_counts'] = []
		rules_dict[keys[i]]['data']['antecedent_counts'] = []

	grouped = df.groupby([df['DATE'].dt.year, df['DATE'].dt.month])

	for key, value in grouped:
		df = value.applymap(str)
		N = len(df)
		# print(key, N)
		for i, rule in enumerate(rules_list):
			X_cols = rules_list[keys[i]]['rule']['X_col']
			X_values = rules_list[keys[i]]['rule']['X_val']

			Y_cols = rules_list[keys[i]]['rule']['Y_col']
			Y_values = rules_list[keys[i]]['rule']['Y_val']
			
			X_Y_cols = X_cols + Y_cols
			X_Y_values = X_values + Y_values

			rules_dict[keys[i]]['rule']['X_col'] = X_cols
			rules_dict[keys[i]]['rule']['X_val'] = X_values
			rules_dict[keys[i]]['rule']['Y_col'] = Y_cols
			rules_dict[keys[i]]['rule']['Y_val'] = Y_values
			
			df4 = df.copy()
			condition = True
			for col, val in zip(X_cols, X_values):
				condition &= (df4[col] == val)  # Combine conditions using logical AND
			df4 = df4[condition]

			df5 = df.copy()
			condition = True
			for col, val in zip(Y_cols, Y_values):
				condition &= (df5[col] == val)  # Combine conditions using logical AND
			df5 = df5[condition]

			df6 = df.copy()
			condition = True
			for col, val in zip(X_Y_cols, X_Y_values):
				condition &= (df6[col] == val)  # Combine conditions using logical AND
			df6 = df6[condition]

			support = len(df6)/N
			confidence = 0
			lift = 0

			if len(df4) > 0:
				confidence = len(df6)/len(df4)

			if len(df5) > 0:
				lift = confidence*(N/len(df5))

			rules_dict[keys[i]]['data']['support'].append(support)
			rules_dict[keys[i]]['data']['confidence'].append(confidence)
			rules_dict[keys[i]]['data']['lift'].append(lift)
			rules_dict[keys[i]]['data']['rule_counts'].append(len(df6))
			rules_dict[keys[i]]['data']['antecedent_counts'].append(len(df4))
			unique_cities = df6['PLACE'].unique().tolist()
			province_data = [{'location': x, 'val': len(df6.loc[df6['PLACE'] == x])} for x in unique_cities]
			rules_dict[keys[i]]['data']['locations'].append(province_data)

	return rules_dict

