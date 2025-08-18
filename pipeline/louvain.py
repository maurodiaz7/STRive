import json
import numpy as np
import networkx as nx
# import community as community_louvain
import random

from datetime import datetime

def load_distance_matrix(filepath):
    try:
        with np.load(filepath) as data:
            return data['matrix']
    except FileNotFoundError:
        print(f"Error: File '{filepath}' not found.")
        return None
    except KeyError:
        print(f"Error: Key 'arr_0' not found in '{filepath}'.")
        return None
    except Exception as e:
        print(f"An error occurred loading '{filepath}': {e}")
        return None

def distance_to_similarity(distance_matrix):
    return 1 - distance_matrix

def create_graph(similarity_matrix):
    return nx.from_numpy_array(similarity_matrix)

def apply_louvain(graph, resolution=1.0, random_state=None):
    # return community_louvain.best_partition(graph, resolution=resolution, random_state=random_state)
    return nx.community.louvain_communities(graph, resolution=resolution, seed=random_state)

def get_cluster_sizes(partition):
    cluster_sizes = {}
    for node, cluster_id in partition.items():
        cluster_sizes.setdefault(cluster_id, 0)
        cluster_sizes[cluster_id] += 1
    return cluster_sizes

def print_cluster_sizes(cluster_sizes):
    for cluster_id, size in cluster_sizes.items():
        print(f"Cluster {cluster_id} size: {size}")

def get_cluster_ids(partition):
    clusters = {}
    for node_id, cluster_id in partition.items():
        clusters.setdefault(cluster_id, []).append(node_id)
    return clusters

def print_cluster_ids(clusters):
    for cluster_id, node_ids in clusters.items():
        print(f"Cluster {cluster_id} IDs: {node_ids}")

def analyze_communities(distances, rule_ids, resolution, random_state=None):
    if distances is None:
        return

    similarity_matrix = distance_to_similarity(distances)
    graph = create_graph(similarity_matrix)
    seed = random.randint(0, 10000000)
    # seed = 6296019
    print('used seed', seed)
    # random.seed(seed)
    partition = apply_louvain(graph, resolution=resolution, random_state=seed)
    cluster_dict = dict()
    for i, value in enumerate(partition):
        i = str(i)
        cluster_dict[i] = [rule_ids[x] for x in value]
    
    print(cluster_dict);

    return cluster_dict