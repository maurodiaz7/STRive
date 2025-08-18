from .generate_rules import generateFPGrowth
from .filter import filter_rules
from .processing_rules import process_rules
from .compute_distances import distances_matrix
from .louvain import analyze_communities

def called(df, features, dates, resolution, min_sup, min_lift):
    print('Generating rules...')
    generateRules = generateFPGrowth(df, features, dates, min_sup, min_lift)
    print('Filtering rules...')
    fil_rules = filter_rules(generateRules)
    print('Processing metrics...')
    rules = process_rules(df, dates, fil_rules)
    print('Calculating distances...')
    distances, rule_ids = distances_matrix(rules)
    print('Clustering...')
    cluster_dict = analyze_communities(distances, rule_ids, resolution)

    return rules, cluster_dict