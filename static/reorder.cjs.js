/* Version: 2.2.4 - September 19, 2022 12:51:28 */
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var science = require('@sgratzl/science');

function range(start, stop, step = 1) {
  if (arguments.length < 2) {
    stop = start;
    start = 0;
  }
  const range = [];
  let i = start;
  if (step < 0) {
    for (; i > stop; i += step) {
      range.push(i);
    }
  } else {
    for (; i < stop; i += step) {
      range.push(i);
    }
  }
  return range;
}

const permutation = range;

function inverse_permutation(perm, dense) {
  const inv = dense ? Array(perm.length) : {};
  for (let i = 0; i < perm.length; i++) {
    inv[perm[i]] = i;
  }
  return inv;
}

// Accorging to
// E. R. Gansner, E. Koutsofios, S. C. North, and K.-P. Vo. 1993. A
// Technique for Drawing Directed Graphs. IEEE Trans. Softw. Eng. 19, 3
// (March 1993), 214-230. DOI=10.1109/32.221135
// http://dx.doi.org/10.1109/32.221135
// page 14: "[...] reduce obvious crossings after the vertices have
// been sorted, transforming a given ordering to one that is locally
// optimal with respect to transposition of adjacent vertices. It
// typically provides an additional 20-50% reduction in edge crossings.

function count_in_crossings(graph, v, w, inv) {
  const v_edges = graph.inEdges(v);
  const w_edges = graph.inEdges(w);
  let cross = 0;

  for (let iw = 0; iw < w_edges.length; iw++) {
    const p0 = inv[w_edges[iw].target.index];
    for (let iv = 0; iv < v_edges.length; iv++) {
      if (inv[v_edges[iv].target.index] > p0) {
        cross++;
      }
    }
  }
  return cross;
}

function count_out_crossings(graph, v, w, inv) {
  const v_edges = graph.outEdges(v);
  const w_edges = graph.outEdges(w);
  let cross = 0;

  for (let iw = 0; iw < w_edges.length; iw++) {
    const p0 = inv[w_edges[iw].source.index];
    for (let iv = 0; iv < v_edges.length; iv++) {
      if (inv[v_edges[iv].source.index] > p0) {
        cross++;
      }
    }
  }
  return cross;
}

/**
 * Optimize two layers by swapping adjacent nodes when
 * it reduces the number of crossings.
 * @param {Graph} graph - the graph these two layers belong to
 * @param {list} layer1 - the ordered list of nodes in layer 1
 * @param {list} layer2 - the ordered list of nodes in layer 2
 * @returns {list} a tuple containing the new layer1, layer2, and crossings count
 */
function adjacent_exchange(graph, layer1, layer2) {
  layer1 = layer1.slice();
  layer2 = layer2.slice();
  const inv_layer1 = inverse_permutation(layer1);
  const inv_layer2 = inverse_permutation(layer2);
  let swapped = true;
  let improved = 0;

  while (swapped) {
    swapped = false;
    for (let i = 0; i < layer1.length - 1; i++) {
      const v = layer1[i];
      const w = layer1[i + 1];
      // should reduce the in crossing and the out crossing
      // otherwise what we gain horizontally is lost vertically
      const c0 = count_out_crossings(graph, v, w, inv_layer2);
      const c1 = count_out_crossings(graph, w, v, inv_layer2);
      if (c0 > c1) {
        layer1[i] = w;
        layer1[i + 1] = v;
        inv_layer1[w] = i;
        inv_layer1[v] = i + 1;
        swapped = true;
        improved += c0 - c1;
      }
    }
    for (let i = 0; i < layer2.length - 1; i++) {
      const v = layer2[i];
      const w = layer2[i + 1];
      const c0 = count_in_crossings(graph, v, w, inv_layer1);
      const c1 = count_in_crossings(graph, w, v, inv_layer1);
      if (c0 > c1) {
        layer2[i] = w;
        layer2[i + 1] = v;
        inv_layer2[w] = i;
        inv_layer2[v] = i + 1;
        swapped = true;
        improved += c0 - c1;
      }
    }
  }

  return [layer1, layer2, improved];
}

/*jshint unused:false */
const { dot, length, normalize: normalize$1, transpose } = science.lin;
const { mean } = science.stats;

// Use as: [4,3,2].sort(cmp_number_asc);
function cmp_number_asc(a, b) {
  return a - b;
}
const cmp_number = cmp_number_asc;

// Use as: [4,3,2].sort(cmp_number_desc);
function cmp_number_desc(a, b) {
  return b - a;
}

// Use as: [[4,3],[2]].reduce(flaten);
function flatten(a, b) {
  return a.concat(b);
}

// Constructs a multi-dimensional array filled with Infinity.
function infinities(n) {
  let i = -1;
  const a = [];
  if (arguments.length === 1) {
    while (++i < n) {
      a[i] = Infinity;
    }
  } else {
    while (++i < n) {
      a[i] = infinities.apply(this, Array.prototype.slice.call(arguments, 1));
    }
  }
  return a;
}

function array1d(n, v) {
  let i = -1;
  const a = Array(n);
  while (++i < n) {
    a[i] = v;
  }
  return a;
}

function check_distance_matrix(mat, tol) {
  const n = mat.length;

  if (!tol) {
    tol = 1e-10;
  }

  if (n != mat[0].length) {
    return 'Inconsistent dimensions';
  }

  for (let i = 0; i < n - 1; i++) {
    const row = mat[i];
    let v1 = row[i];
    if (v1 < 0) {
      return `Negative value at diagonal ${i}`;
    }
    if (v1 > tol) {
      return `Diagonal not zero at ${i}`;
    }
    for (let j = 1; j < n; j++) {
      v1 = row[j];
      const v2 = mat[j][i];
      if (Math.abs(v1 - v2) > tol) {
        return `Inconsistency at ${i},${j}`;
      }
      if (v1 < 0) {
        return `Negative value at ${i},${j}`;
      }
      if (v2 < 0) {
        return `Negative value at ${j},${i}`;
      }
    }
  }
  return false;
}

function fix_distance_matrix(mat, tol) {
  const n = mat.length;
  if (!tol) {
    tol = 1e-10;
  }

  if (n != mat[0].length) {
    throw `Inconsistent dimensions ${n} != ${mat[0].length}`;
  }

  for (let i = 0; i < n - 1; i++) {
    const row = mat[i];
    let v1 = row[i];
    if (v1 < 0) {
      if (-v1 > tol) {
        throw `Negative value at diagonal${i}`;
      }
      v1 = row[i] = 0;
    } else if (v1 > tol) {
      throw `Diagonal not zero at ${i}`;
    }
    for (let j = 1; j < n; j++) {
      v1 = row[j];
      let v2 = mat[j][i];
      if (Math.abs(v1 - v2) > tol) {
        throw `Inconsistency at ${i},${j}`;
      }
      if (v1 < 0) {
        v1 = 0;
      }
      if (v2 < 0) {
        v2 = 0;
      }
      if (v1 != v2) {
        v1 += v2;
        v1 /= 2;
      }
      row[j] = v1;
      mat[j][i] = v1;
    }
  }
  return mat;
}

/**
 * Returns a list of distance matrices, computed for the specified
 * connected components of a graph, or all the components if none is
 * specified.
 * @param {Graph} graph - the graph
 * @param {Array} comps [optional] the specified connected component list
 * @returns {Array} a list of distance matrices, in the order of the
 * nodes in the list of connected components.
 */
function all_pairs_distance(graph, comps) {
  const distances = [];
  if (!comps) {
    comps = graph.components();
  }

  for (let i = 0; i < comps.length; i++) {
    distances.push(all_pairs_distance_floyd_warshall(graph, comps[i]));
  }
  return distances;
}

/**
 * Returns a distance matrix, computed for the specified
 * connected component of a graph.
 * @param {Graph} graph - the graph
 * @param {Array} comp - the connected component as a list of nodes
 * @returns {Matrix} a distance matrix, in the order of the
 * nodes in the list of connected components.
 */
function all_pairs_distance_floyd_warshall(graph, comp) {
  const dist = infinities(comp.length, comp.length);
  // Floyd Warshall,
  // see http://ai-depot.com/BotNavigation/Path-AllPairs.html
  // O(n^3) unfortunately

  const inv = inverse_permutation(comp);

  for (let i = 0; i < comp.length; i++) {
    dist[i][i] = 0;
  }

  const build_dist = (e) => {
    if (e.source == e.target) {
      return;
    }
    if (!(e.source.index in inv) || !(e.target.index in inv)) {
      return;
    } // ignore edges outside of comp
    const u = inv[e.source.index];
    const v = inv[e.target.index];
    dist[v][u] = dist[u][v] = graph.distance(e.index);
  };
  for (let i = 0; i < comp.length; i++) {
    graph.edges(comp[i]).forEach(build_dist);
  }

  for (let k = 0; k < comp.length; k++) {
    for (let i = 0; i < comp.length; i++) {
      if (dist[i][k] != Infinity) {
        for (let j = 0; j < comp.length; j++) {
          if (dist[k][j] != Infinity && dist[i][j] > dist[i][k] + dist[k][j]) {
            dist[i][j] = dist[i][k] + dist[k][j];
            dist[j][i] = dist[i][j];
          }
        }
      }
    }
  }
  return dist;
}

/**
 * Returns a distance matrix, computed for the specified
 * connected component of a graph, and the information to compute the
 * shortest paths.
 * @param {Graph} graph - the graph
 * @param {Array} comp - the connected component as a list of nodes
 * @returns {list} a distance matrix, in the order of the
 * nodes in the list of connected components, and a table used to
 * reconstruct the shortest paths with the {@link
 * floyd_warshall_path} function.
 */

function floyd_warshall_with_path(graph, comp) {
  if (!comp) {
    comp = graph.components()[0];
  }

  const dist = infinities(comp.length, comp.length);
  const next = Array(comp.length);
  const directed = graph.directed();

  // Floyd Warshall,
  // see http://ai-depot.com/BotNavigation/Path-AllPairs.html
  // O(n^3) unfortunately

  const inv = inverse_permutation(comp);

  for (let i = 0; i < comp.length; i++) {
    dist[i][i] = 0;
    next[i] = Array(comp.length);
  }

  const build_dist = (e) => {
    if (e.source == e.target) {
      return;
    }
    const u = inv[e.source.index];
    const v = inv[e.target.index];
    dist[u][v] = graph.distance(e);
    next[u][v] = v;
    if (!directed) {
      dist[v][u] = graph.distance(e);
      next[v][u] = u;
    }
  };

  for (let i = 0; i < comp.length; i++) {
    graph.edges(comp[i]).forEach(build_dist);
  }

  for (let k = 0; k < comp.length; k++) {
    for (let i = 0; i < comp.length; i++) {
      for (let j = 0; j < comp.length; j++) {
        if (dist[i][j] > dist[i][k] + dist[k][j]) {
          dist[i][j] = dist[i][k] + dist[k][j];
          next[i][j] = next[i][k];
          if (!directed) {
            dist[j][i] = dist[i][j];
            next[j][i] = next[k][j];
          }
        }
      }
    }
  }
  return [dist, next];
}

/**
 * Returns the shortest path from node u to node v, from the table
 * returned by {@link floyd_warshall_with_path}.
 * @param {Array} next - the next information
 * @param {Integer} u - the starting node
 * @param {Integer} v - the ending node
 * @return {list} a list of nodes in the shortest path from u to v
 */
function floyd_warshall_path(next, u, v) {
  if (next[u][v] === undefined) {
    return [];
  }
  const path = [u];
  while (u != v) {
    u = next[u][v];
    path.push(u);
  }
  return path;
}

/**
 * Compute the bandwidth of a graph, given and order.
 * @param  {Graph} graph - the graph 
 * @param {list} order - a permutation
 * @returns {integer} the bandwidth 
 */
function bandwidth(graph, order) {
  if (!order) {
    order = range(graph.nodes().length);
  }

  const inv = inverse_permutation(order);
  const links = graph.links();
  let max = 0;

  for (let i = 0; i < links.length; i++) {
    const e = links[i];
    const d = Math.abs(inv[e.source.index] - inv[e.target.index]);
    max = Math.max(max, d);
  }
  return max;
}

/**
 * Compute the bandwidth of an adjacency matrix,
 * i.e. the maximum distace between two endpoints 
 * over all edges.
 * @param  {Matrix} matrix - the matrix
 * @returns {integer} the bandwidth 
 */
function bandwidth_matrix(matrix) {
  let max = 0;
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[0].length; j++) {
      if (matrix[i][j] > 0) {
        max = Math.max(max, Math.abs(i - j));
      }
    }
  }
  return max;
}

const version = '2.2.4'; // managed by rollup-plugin-version-injector
exports.debug = false;

function set_debug(v = true) {
  exports.debug = v;
}

// Wilhelm Barth, Petra Mutzel, Michael Jünger:
// Simple and Efficient Bilayer Cross Counting.
// J. Graph Algorithms Appl. 8(2): 179-194 (2004)
/*jshint loopfunc:true */
function count_crossings(graph, north, south) {
  const comp = permutation(graph.nodes().length);

  if (north === undefined) {
    north = comp.filter((n) => graph.outDegree(n) !== 0);
    south = comp.filter((n) => graph.inDegree(n) !== 0);
  }

  // Choose the smaller axis
  let invert = false;
  if (north.length < south.length) {
    const tmp = north;
    north = south;
    south = tmp;
    invert = true;
  }

  const south_inv = inverse_permutation(south);
  let southsequence = [];

  for (let i = 0; i < north.length; i++) {
    const n = invert
      ? graph.inEdges(north[i]).map((e) => south_inv[e.target.index])
      : graph.outEdges(north[i]).map((e) => south_inv[e.source.index]);
    n.sort(cmp_number);
    southsequence = southsequence.concat(n);
  }

  let firstIndex = 1;
  while (firstIndex < south.length) {
    firstIndex <<= 1;
  }

  const treeSize = 2 * firstIndex - 1;
  firstIndex -= 1;
  const tree = science.zeroes(treeSize);

  let crosscount = 0;
  for (let i = 0; i < southsequence.length; i++) {
    let index = southsequence[i] + firstIndex;
    tree[index]++;
    while (index > 0) {
      if (index % 2) {
        crosscount += tree[index + 1];
      }
      index = (index - 1) >> 1;
      tree[index]++;
    }
  }
  return crosscount;
}

function barycenter_order(graph, comps, max_iter) {
  let orders = [[], [], 0];
  // Compute the barycenter heuristic on each connected component
  if (!comps) {
    comps = graph.components();
  }
  for (let i = 0; i < comps.length; i++) {
    const o = barycenter(graph, comps[i], max_iter);
    orders = [orders[0].concat(o[0]), orders[1].concat(o[1]), orders[2] + o[2]];
  }
  return orders;
}

// Take the list of neighbor indexes and return the median according to
// P. Eades and N. Wormald, Edge crossings in drawings of bipartite graphs.
// Algorithmica, vol. 11 (1994) 379–403.
function median$1(neighbors) {
  if (neighbors.length === 0) {
    return -1;
  } // should not happen
  if (neighbors.length === 1) {
    return neighbors[0];
  }
  if (neighbors.length === 2) {
    return (neighbors[0] + neighbors[1]) / 2;
  }
  neighbors.sort(cmp_number);
  if (neighbors.length % 2) {
    return neighbors[(neighbors.length - 1) / 2];
  }
  const rm = neighbors.length / 2;
  const lm = rm - 1;
  const rspan = neighbors[neighbors.length - 1] - neighbors[rm];
  const lspan = neighbors[lm] - neighbors[0];
  if (lspan == rspan) {
    return (neighbors[lm] + neighbors[rm]) / 2;
  } else {
    return (neighbors[lm] * rspan + neighbors[rm] * lspan) / (lspan + rspan);
  }
}

function barycenter(graph, comp, max_iter) {
  const nodes = graph.nodes();
  let crossings;
  let iter;
  let layer;
  let neighbors;
  let med;

  let layer1 = comp.filter((n) => graph.outDegree(n) !== 0);
  let layer2 = comp.filter((n) => graph.inDegree(n) !== 0);

  // If the layers are equal, we want to modify them simultaneously (for undirected graphs)
  if (!graph.directed()) {
    layer1 = layer2;
  }

  if (comp.length < 3) {
    return [layer1, layer2, count_crossings(graph, layer1, layer2)];
  }

  if (!max_iter) {
    max_iter = 24;
  } else if (max_iter % 2 == 1) {
    max_iter++;
  } // want even number of iterations

  let inv_layer = inverse_permutation(layer2);

  let best_crossings = count_crossings(graph, layer1, layer2);
  let best_layer1 = layer1.slice();
  let best_layer2 = layer2.slice();
  let best_iter = 0;

  let v;
  const inv_neighbor = (e) =>
    inv_layer[e.source == v ? e.target.index : e.source.index];

  const barycenter_sort = (a, b) => {
    let d = med[a] - med[b];
    if (d === 0) {
      // If both values are equal,
      // place the odd degree vertex on the left of the even
      // degree vertex
      d = (graph.edges(b).length % 2) - (graph.edges(a).length % 2);
    }
    if (d < 0) {
      return -1;
    } else if (d > 0) {
      return 1;
    }
    return 0;
  };

  for (
    layer = layer1, iter = 0;
    iter < max_iter;
    iter++, layer = layer == layer1 ? layer2 : layer1
  ) {
    med = {};
    for (let i = 0; i < layer.length; i++) {
      // Compute the median/barycenter for this node and set
      // its (real) value into node.pos
      v = nodes[layer[i]];
      if (layer == layer1) {
        neighbors = graph.outEdges(v.index);
      } else {
        neighbors = graph.inEdges(v.index);
      }
      neighbors = neighbors.map(inv_neighbor);
      med[v.index] = +median$1(neighbors);
    }
    layer.sort(barycenter_sort);
    for (let i = 0; i < layer.length; i++) {
      inv_layer = inverse_permutation(layer);
    }
    crossings = count_crossings(graph, layer1, layer2);
    if (crossings < best_crossings) {
      best_crossings = crossings;
      best_layer1 = layer1.slice();
      best_layer2 = layer2.slice();
      best_iter = iter;
      max_iter = Math.max(max_iter, iter + 2); // we improved so go on
    }
  }
  if (exports.debug) {
    console.log(`Best iter: ${best_iter}`);
  }

  return [best_layer1, best_layer2, best_crossings];
}

class Queue {
  constructor() {
    this.length = 0;
  }

  push(item) {
    const node = { item };
    if (this.last) {
      this.last = this.last.next = node;
    } else {
      this.last = this.first = node;
    }
    this.length++;
  }

  shift() {
    const node = this.first;
    if (node) {
      this.first = node.next;
      if (!--this.length) {
        this.last = undefined;
      }
      return node.item;
    }
  }

  slice(start = 0, end = Infinity) {
    const output = [];

    let i = 0;
    for (let node = this.first; node; node = node.next) {
      if (--end < 0) {
        break;
      } else if (++i > start) {
        output.push(node.item);
      }
    }
    return output;
  }
}

function bfs(graph, v, fn) {
  const q = new Queue();
  const discovered = {};
  q.push(v);
  discovered[v] = true;
  fn(v, undefined);
  while (q.length) {
    v = q.shift();
    fn(v, v);
    const edges = graph.edges(v);
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      const v2 = graph.other(e, v).index;
      if (!discovered[v2]) {
        q.push(v2);
        discovered[v2] = true;
        fn(v, v2);
      }
    }
    fn(v, -1);
  }
}

function bfs_distances(graph, v) {
  const dist = {};
  dist[v] = 0;
  bfs(graph, v, (v, c) => {
    if (c >= 0 && v != c) {
      dist[c] = dist[v] + 1;
    }
  });
  return dist;
}

function all_pairs_distance_bfs(graph, comps) {
  if (!comps) {
    comps = [graph.nodes_indices()];
  }
  const nodes = comps.reduce(flatten).sort(cmp_number);
  const mat = Array(nodes.length);

  for (let i = 0; i < nodes.length; i++) {
    mat[i] = Array(nodes.length);
  }

  for (let i = 0; i < nodes.length; i++) {
    const dist = bfs_distances(graph, i);
    for (let j in dist) {
      mat[i][j] = dist[j];
      mat[j][i] = dist[j];
    }
  }

  return mat;
}

/*jshint loopfunc:true */
const bfs_order = (graph, comps) => {
  if (!comps) {
    comps = graph.components();
  }

  const order = [];

  for (let i = 0; i < comps.length; i++) {
    const comp = comps[i];
    bfs(graph, comp[0], (v, c) => {
      if (c >= 0 && v != c) {
        order.push(v);
      }
    });
  }

  return order;
};

function sort_order(v) {
  return permutation(0, v.length).sort((a, b) => v[a] - v[b]);
}

const sort_order_ascending = sort_order;

function sort_order_descending(v) {
  return permutation(0, v.length).sort((a, b) => v[b] - v[a]);
}

//Corresponence Analysis
// see http://en.wikipedia.org/wiki/Correspondence_analysis

function sumrows(v) {
  const n = v.length;
  const o = v[0].length;
  const sumrow = Array(n);

  for (let i = 0; i < n; i++) {
    const row = v[i];
    let s = 0;
    for (let j = 0; j < o; j++) {
      s += row[j];
    }
    sumrow[i] = s;
  }

  return sumrow;
}

function sumcols(v) {
  const n = v.length;
  const o = v[0].length;
  const sumcol = science.zeroes(o);

  for (let i = 0; i < n; i++) {
    const row = v[i];
    for (let j = 0; j < o; j++) {
      sumcol[j] += row[j];
    }
  }

  return sumcol;
}

// Implementation of the decorana fortran code
// See Hill, M. O. 1979. DECORANA - A FORTRAN program for detrended
// correspondence analysis an reciprocal averaging. Cornell University,
// Ithaca, New York.
// And
// Hill, M. O. 1973. Reciprocal averaging: an eigenvector method of
// ordination. J. Ecol. 61:237-49
// The Fortan implementation is available in the "vegan" R package:
// https://cran.r-project.org/web/packages/vegan/index.html

function decorana(dat) {
  // consider as zero eigenvalue
  const ZEROEIG = 1e-7;

  const nr = dat.length;
  const nc = dat[0].length;

  const adotj = sumcols(dat);
  const aidot = sumrows(dat);
  //console.log('adotj='); printvec(adotj);
  //console.log('aidot='); printvec(aidot);

  const s1 = eigy(
    array1d(nr, 1.0),
    array1d(nc, 1.0),
    nr,
    nc,
    dat,
    aidot,
    adotj
  );
  if (s1.eig < ZEROEIG) {
    s1.rows = s1.cols = [];
    s1.eig = 0;
  } else {
    const x = s1.rows;
    const y = s1.cols;
    yxmult(y, x, nr, nc, dat);
    for (let i = 0; i < nr; i++) {
      x[i] /= aidot[i];
    }
  }
  return s1;
}

function trans(y, yy, x, aidot, mi, n, dat, prt) {
  if (prt) {
    console.log(`TRANS ${prt}`);
  }
  yxmult(y, x, mi, n, dat, prt);
  for (let i = 0; i < mi; i++) {
    x[i] = x[i] / aidot[i]; // 10
  }
  // 100
  // a1 = 0;
  // for (i = 0; i < mi; i++)
  // 	a1 += aidot[i]*x[i]; // 110
  // for (i = 0; i < mi; i++)
  // 	x[i] -= a1; // 120
  // 200
  xymult(x, yy, mi, n, dat, prt);
}

function printvec$1(y) {
  console.log('');
  for (let i = 0; i < y.length; i++) {
    console.log(`i:${i + 1} v:  ${y[i].toFixed(5)}`);
  }
}

function xymult(x, y, mi, n, dat, prt) {
  if (prt) {
    console.log('xymult');
    printvec$1(y);
  }
  for (let j = 0; j < n; j++) {
    y[j] = 0;
  } // 10
  for (let i = 0; i < mi; i++) {
    const ax = x[i];
    const row = dat[i];
    for (let j = 0; j < n; j++) {
      y[j] += ax * row[j];
    } // 20
  }
  if (prt) {
    //console.log('xymult[1]=');
    printvec$1(y);
  }
}

function yxmult(y, x, mi, n, dat, prt) {
  if (prt) {
    console.log('yxmult');
    printvec$1(x);
  }
  for (let i = 0; i < mi; i++) {
    let ax = 0;
    const row = dat[i];
    for (let j = 0; j < n; j++) {
      ax += y[j] * row[j]; // 10
    }
    x[i] = ax; // 20
  }
  if (prt) {
    //console.log('yxmult[1]=');
    printvec$1(x);
  }
}

function eigy(x, y, mi, n, dat, aidot, adotj) {
  let icount;
  let a;
  let ay;
  let ex;
  let a11;
  let a12;
  let a22;
  let a23;
  let a33;
  let a34;
  let a44;
  let res;
  let ax1;
  let ax2;
  let ax3;
  let ax4;
  let b13;
  let b14;
  let b24;
  let row;
  const y2 = science.zeroes(n);
  const y3 = science.zeroes(n);
  const y4 = science.zeroes(n);
  const y5 = science.zeroes(n);

  let tot = 0;
  for (let j = 0; j < n; j++) {
    tot += adotj[j];
    y[j] = j + 1.0; // 10
  }
  y[0] = 1.1;

  let tol = 0.000005;
  trans(y, y, x, aidot, mi, n, dat); //,1);
  icount = 0;
  for (;;) {
    // 20
    a = 0;
    for (let j = 0; j < n; j++) {
      a += y[j] * adotj[j];
    } // 30
    a /= tot;
    ex = 0;
    for (let j = 0; j < n; j++) {
      ay = y[j] - a;
      ex += ay * ay * adotj[j];
      y[j] = ay; // 40
    }
    ex = Math.sqrt(ex);
    for (let j = 0; j < n; j++) {
      y[j] /= ex;
    } // 50
    trans(y, y2, x, aidot, mi, n, dat); //,2);
    a = 0;
    a11 = 0;
    a12 = 0;
    a22 = 0;
    a23 = 0;
    a33 = 0;
    a34 = 0;
    a44 = 0;
    for (let j = 0; j < n; j++) {
      ay = y2[j];
      y2[j] = ay / adotj[j];
      a += ay;
      a11 += ay * y[j]; // 60
    }
    a /= tot;
    for (let j = 0; j < n; j++) {
      ay = y2[j] - (a + a11 * y[j]);
      a12 += ay * ay * adotj[j];
      y2[j] = ay; // 70
    }
    a12 = Math.sqrt(a12);
    for (let j = 0; j < n; j++) {
      y2[j] /= a12;
    } // 80
    if (a12 < tol || icount > 999) {
      break;
    }
    icount++;
    trans(y2, y3, x, aidot, mi, n, dat); //,3);
    a = 0;
    b13 = 0;
    for (let j = 0; j < n; j++) {
      ay = y3[j];
      y3[j] = ay / adotj[j];
      a += ay;
      a22 += ay * y2[j];
      b13 += ay * y[j]; // 90
    }
    a /= tot;
    for (let j = 0; j < n; j++) {
      ay = y3[j] - (a + a22 * y2[j] + b13 * y[j]);
      a23 += ay * ay * adotj[j];
      y3[j] = ay; // 100
    }
    a23 = Math.sqrt(a23);
    if (a23 > tol) {
      // 105
      for (let j = 0; j < n; j++) {
        y3[j] /= a23; // 110
      }
      trans(y3, y4, x, aidot, mi, n, dat); //,4);
      a = 0;
      b14 = 0;
      b24 = 0;
      for (let j = 0; j < n; j++) {
        ay = y4[j];
        y4[j] /= adotj[j];
        a += ay;
        a33 += ay * y3[j];
        b14 += ay * y[j];
        b24 += ay * y2[j]; // 120
      }
      a /= tot;
      for (let j = 0; j < n; j++) {
        ay = y4[j] - (a + a33 * y3[j] + b14 * y[j] + b24 * y2[j]);
        a34 += ay * ay * adotj[j];
        y4[j] = ay; // 130
      }
      a34 = Math.sqrt(a34);
      if (a34 > tol) {
        // 135
        for (let j = 0; j < n; j++) {
          y4[j] /= a34;
        } // 140
        trans(y4, y5, x, aidot, mi, n, dat); //,5);
        for (let j = 0; j < n; j++) {
          a44 += y4[j] * y5[j];
        } // 150
      } else {
        a34 = 0;
      }
    } else {
      a23 = 0;
    }
    // 160
    res = solve_tridiag(tol, a11, a12, a22, a23, a33, a34, a44);
    ax1 = res[0];
    ax2 = res[1];
    ax3 = res[2];
    ax4 = res[3];
    // console.log('i '+icount+
    // 	    ' ax1 '+ax1.toFixed(6)+
    // 	    ' ax2 '+ax2.toFixed(6)+
    // 	    ' ax3 '+ax3.toFixed(6)+
    // 	    ' ax4 '+ax4.toFixed(6));

    // 180
    if (a12 < tol) {
      break;
    }
    for (let j = 0; j < n; j++) {
      y[j] = ax1 * y[j] + ax2 * y2[j] + ax3 * y3[j] + ax4 * y4[j];
    } // 190
    // goto 20
  }
  // 200
  //console.log('eigenvalue',a11.toFixed(6));
  if (a12 > tol && exports.debug > 0) {
    console.log('residual bigger than tolerance on axis 1');
  }
  let aymax = y[0];
  let aymin = y[0];
  for (let j = 1; j < n; j++) {
    a = y[j];
    if (a < aymin) {
      aymin = a;
    } else if (a > aymax) {
      aymax = a;
    }
  }
  if (-aymin > aymax) {
    for (
      let j = 0;
      j < n;
      j++ // 210
    ) {
      y[j] = -y[j];
    }
  }
  yxmult(y, x, mi, n, dat); //,true);
  for (let i = 0; i < mi; i++) {
    x[i] /= aidot[i];
  } // 220
  // 225
  let axlong = 0;
  for (let i = 0; i < mi; i++) {
    axlong += aidot[i] * sqr(x[i]);
  } // 230
  axlong = Math.sqrt(axlong);
  for (let i = 0; i < mi; i++) {
    x[i] /= axlong;
  } // 240
  for (let j = 0; j < n; j++) {
    y[j] /= axlong;
  } // 250
  let sumsq = 0;
  let ax;
  for (let i = 0; i < mi; i++) {
    ax = x[i];
    row = dat[i];
    for (let j = 0; j < n; j++) {
      sumsq += row[j] * sqr(ax - y[j]); // 255
    }
    // 260
  }
  let sd = Math.sqrt(sumsq / tot);
  if (a11 >= 0.999) {
    sd = aymax / axlong;
    const sd1 = -aymin / axlong;
    if (sd1 > sd) {
      sd = sd1;
    }
  }
  // 265
  for (let j = 0; j < n; j++) {
    y[j] /= sd;
  } // 270

  //printvec(x);
  //printvec(y);
  return { rows: x, cols: y, eig: a11 };
}

function sqr(x) {
  return x * x;
}

function solve_tridiag(tol, a11, a12, a22, a23, a33, a34, a44) {
  // 160
  let ax1 = 1.0;
  let ax2 = 0.1;
  let ax3 = 0.01;
  let ax4 = 0.001;
  let axx1;
  let axx2;
  let axx3;
  let axx4;
  let ex;
  let exx;
  let resi;
  //console.log('a11:'+a11+' a12:'+a12+' a22:'+a22);
  //console.log('a23:'+a23+' a33:'+a33+' a34:'+a34+' a44:'+a44);
  for (let itimes = 0; itimes < 100; itimes++) {
    axx1 = a11 * ax1 + a12 * ax2;
    axx2 = a12 * ax1 + a22 * ax2 + a23 * ax3;
    axx3 = a23 * ax2 + a33 * ax3 + a34 * ax4;
    axx4 = a34 * ax3 + a44 * ax4;
    ax1 = a11 * axx1 + a12 * axx2;
    ax2 = a12 * axx1 + a22 * axx2 + a23 * axx3;
    ax3 = a23 * axx2 + a33 * axx3 + a34 * axx4;
    ax4 = a34 * axx3 + a44 * axx4;
    ex = Math.sqrt(sqr(ax1) + sqr(ax2) + sqr(ax3) + sqr(ax4));
    ax1 = ax1 / ex;
    ax2 = ax2 / ex;
    ax3 = ax3 / ex;
    ax4 = ax4 / ex;
    if ((itimes + 1) % 5 === 0) {
      exx = Math.sqrt(ex);
      resi = Math.sqrt(
        sqr(ax1 - axx1 / exx) +
          sqr(ax2 - axx2 / exx) +
          sqr(ax3 - axx3 / exx) +
          sqr(ax4 - axx4 / exx)
      );
    }
    if (resi < tol * 0.05) {
      break;
    }
    // 170
  }
  // 180
  return [ax1, ax2, ax3, ax4];
}

const ca_decorana = decorana;
const ca = decorana;

function ca_order(dat) {
  const res = ca(dat);
  return {
    rows: sort_order(res.rows),
    cols: sort_order(res.cols),
    details: res,
  };
}

function condition(matrix) {
  let min;
  let max;
  const ret = [];

  for (let i = 0; 0 < matrix.length; i++) {
    const row = matrix[i].slice();
    let j;
    row.push(ret);
    for (j = 0; j < ret.length; j++) {
      const v = row[j];
      if (v !== null) {
        min = max = row[j];
        break;
      }
    }
    for (; j < ret.length; j++) {
      const v = row[j];
      if (v < min) {
        min = v;
      } else if (v > max) {
        max = v;
      }
    }
    const s = max != min ? 1.0 / (max - min) : 0;
    for (j = 1; j < ret.length; j++) {
      const v = row[j];
      if (v !== null && v >= v) {
        row[j] = row[j] * s - min;
      }
      //else v = NaN;
    }
  }
  return ret;
}

const correlation = {
  pearson(a, b) {
    const ma = mean(a);
    const mb = mean(b);
    const n = Math.min(a.length, b.length);
    if (n === 0) {
      return NaN;
    }
    let s1 = 0;
    let s2 = 0;
    let s3 = 0;
    for (let i = 0; i < n; i++) {
      const dx = a[i] - ma;
      const dy = b[i] - mb;
      s1 += dx * dy;
      s2 += dx * dx;
      s3 += dy * dy;
    }
    return s1 / Math.sqrt(s2 * s3);
  },
  pearsonMatrix(matrix) {
    const cor = correlation.pearson;
    const n = matrix.length;
    if (n === 0) {
      return NaN;
    }
    // do it the hard way for now, we'll optimize later
    const ret = science.zeroes(n, n);
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const p = cor(matrix[i], matrix[j]);
        ret[i][j] = ret[j][i] = p;
      }
    }
    return ret;
    // mx = Array(n);
    // sx = zeroes(n);
    // sx2 = zeroes(n);
    // for (i = 0; i < n; i++) {
    //     mx[i] = science.stats.mean(matrix[i]);
    // }
    // for (i = 0; i < n; i++) {
    //     a = matrix[i];
    //     ma = mx[i];
    //     for (j = 0; j < n; j++) {
    // 	dx = (a[j] - ma);
    // 	sx[j] += dx;
    // 	sx2[j] += dx*dx;
    //     }
    // }
    // for (i = 0; i < n; i++) {
    //     ret[i] = Array(n);
    //     for (j = 0; j < n; j++) {
    // 	ret[i][j] = sx[i]*sx[j]/Math.sqrt(sx2[i]*sx2[j]);
    //     }
    // }
    // return ret;
  },
};

const covariance = dot;

function covariancetranspose(v, a, b) {
  const n = v.length;
  let cov = 0;
  for (let i = 0; i < n; i++) {
    cov += v[i][a] * v[i][b];
  }
  return cov;
}

function variancecovariance(v) {
  const o = v[0].length;
  const cov = Array(o);

  for (let i = 0; i < o; i++) {
    cov[i] = Array(o);
  }

  for (let i = 0; i < o; i++) {
    for (let j = i; j < o; j++) {
      cov[i][j] = cov[j][i] = covariancetranspose(v, i, j);
    }
  }

  return cov;
}

/*jshint loopfunc:true */
function cuthill_mckee(graph, comp) {
  if (comp.length < 3) {
    return comp;
  }

  const visited = {};
  const queue = new Queue();
  const inv = inverse_permutation(comp);
  const perm = [];

  let start = comp[0];
  let min_deg = graph.degree(start);

  for (let i = 0; i < comp.length; i++) {
    const n = comp[i];
    if (graph.degree(n) < min_deg) {
      min_deg = graph.degree(n);
      start = n;
      if (min_deg == 1) {
        break;
      }
    }
  }
  queue.push(start);
  while (queue.length !== 0) {
    const n = queue.shift();
    if (visited[n]) {
      continue;
    }
    visited[n] = true;
    perm.push(n);
    const e = graph
      .edges(n)
      .map((edge) => graph.other(edge, n).index)
      .filter((n) => !visited[n] && n in inv)
      // ascending by degree
      .sort((a, b) => graph.degree(a) - graph.degree(b));

    e.forEach(queue.push, queue);
  }
  return perm;
}

function reverse_cuthill_mckee(graph, comp) {
  return cuthill_mckee(graph, comp).reverse();
}

function cuthill_mckee_order(graph, comps) {
  let comp;
  let order = [];

  if (!comps) {
    comps = graph.components();
  }
  for (let i = 0; i < comps.length; i++) {
    comp = comps[i];
    order = order.concat(cuthill_mckee(graph, comp));
  }
  return order;
}

function reverse_cuthill_mckee_order(graph, comps) {
  let comp;
  let order = [];

  if (!comps) {
    comps = graph.components();
  }
  for (let i = 0; i < comps.length; i++) {
    comp = comps[i];
    order = order.concat(reverse_cuthill_mckee(graph, comp));
  }
  return order;
}

function displaymat(mat, rowperm, colperm) {
  console.log('Matrix:');
  for (let i = 0; i < mat.length; i++) {
    const row = rowperm ? mat[rowperm[i]] : mat[i];
    let str = '';
    for (let j = 0; j < row.length; j++) {
      const col = colperm ? row[colperm[j]] : row[j];
      str += col ? '*' : ' ';
    }
    console.log(str);
  }
}

function printvec(row, prec, colperm, line) {
  if (!line) {
    line = '';
  }
  for (let j = 0; j < row.length; j++) {
    if (line.length !== 0) {
      line += ', ';
    }
    if (colperm) {
      line += row[colperm[j]].toFixed(prec);
    } else {
      line += row[j].toFixed(prec);
    }
  }
  console.log(line);
}

function printmat(m, prec, rowperm, colperm) {
  if (!prec) {
    prec = 4;
  }
  for (let i = 0; i < m.length; i++) {
    const row = rowperm ? m[rowperm[i]] : m[i];
    printvec(row, prec, colperm, `${i}: `);
  }
}

function assert(v, msg) {
  if (!v) {
    console.log(msg);
    throw msg || 'Assertion failed';
  }
}

function printhcluster(cluster, indent) {
  if (cluster.left === null) {
    return `${Array(indent + 1).join(' ')}id: ${cluster.id}`;
  }

  return `${Array(indent + 1).join(' ')}id: ${cluster.id}, dist: ${
    cluster.dist
  }\n${printhcluster(cluster.left, indent + 1)}\n${printhcluster(
    cluster.right,
    indent + 1
  )}`;
}

function isNum(a, b) {
  return !(isNaN(a) || isNaN(b) || a == Infinity || b == Infinity);
}
const distance = {};

distance.euclidean = function(a, b) {
  let s = 0;
  for (let i = a.length-1; i >= 0; i--) {
    if (isNum(a[i], b[i])) {
      const x = a[i] - b[i];
      s += x * x;
    }
  }
  return Math.sqrt(s);
};

distance.manhattan = function(a, b) {
  let s = 0;
  for (let i = a.length-1; i >= 0; i--) {
    if (isNum(a[i], b[i])) {
      s += Math.abs(a[i] - b[i]);
    }
  }
  return s;
};

distance.minkowski = function(p) {
  return (a, b) => {
    let s = 0;
    for (let i = a.length-1; i >= 0; i--) {
      if (isNum(a[i], b[i])) {
        s += Math.pow(Math.abs(a[i] - b[i]), p);
      }
    }
    return Math.pow(s, 1 / p);
  };
};


distance.chebyshev = function(a, b) {
  let max = 0;
  for (let i = a.length-1; i >= 0; i--) {
    if (isNum(a[i], b[i])) {
      const x = Math.abs(a[i] - b[i]);
      if (x > max) {
        max = x;
      }
    }
  }
  return max;
};

distance.hamming = function(a, b) {
  let d = 0;
  for (let i = a.length-1; i >= 0; i--) {
    if (isNum(a[i], b[i])) {
      if (a[i] !== b[i]) {
        d++;
      }
    }
  }
  return d;
};

distance.jaccard = function(a, b) {
  let n = 0;
  let s = 0;
  for (let i = a.length-1; i >= 0; i--) {
    if (isNum(a[i], b[i])) {
      if (a[i] === b[i]) {
        s++;
      }
      n++;
    }
  }
  if (n === 0) {
    return 0;
  }
  return s / n;
};

distance.braycurtis = function(a, b) {
  let s0 = 0;
  let s1 = 0;
  for (let i = a.length-1; i >= 0; i--) {
    const ai = a[i];
    const bi = b[i];
    if (isNum(ai, bi)) {
      s0 += Math.abs(ai - bi);
      s1 += Math.abs(ai + bi);
    }
  }
  if (s1 === 0) {
    return 0;
  }
  return s0 / s1;
};

// A distance measure based on Moran's I
// Note that this distance can be both negative (similar) and positive (not similar, the higher the distance, the less similar a and b)
//
// N. van Beusekom, W. Meulemans, B. Speckmann, Simultaneous Orderings for Graph Collections
// IEEE Transactions on Visualization and Computer Graphics, vol. 28, no. 1, pp. 1-10, Jan. 2022
distance.morans = function(matrix) {
  let m = 0;
  const n = matrix.length * matrix[0].length;
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[0].length; j++) {
      m += matrix[i][j];
    }
  }
  return (a, b) => {
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      if (isNum(a[i], b[i])) {
        result += (a[i] * n - m) * (b[i] * n - m);
      }
    }
    return -1 * result;
  };
};

function dist() {
  let distance$1 = distance.euclidean;

  function dist(vectors) {
    const n = vectors.length;
    const distMatrix = [];

    for (let i = 0; i < n; i++) {
      const d = [];
      distMatrix[i] = d;
      for (let j = 0; j < n; j++) {
        if (j < i) {
          d.push(distMatrix[j][i]);
        } else if (i === j) {
          d.push(0);
        } else {
          d.push(distance$1(vectors[i], vectors[j]));
        }
      }
    }
    return distMatrix;
  }

  dist.distance = function (x) {
    if (!arguments.length) {
      return distance$1;
    }
    distance$1 = x;
    return dist;
  };

  return dist;
}

function distmax(distMatrix) {
  let max = 0;
  const n = distMatrix.length;

  for (let i = 0; i < n; i++) {
    const row = distMatrix[i];
    for (let j = i + 1; j < n; j++) {
      if (row[j] > max) {
        max = row[j];
      }
    }
  }

  return max;
}

function distmin(distMatrix) {
  let min = Infinity;
  const n = distMatrix.length;

  for (let i = 0; i < n; i++) {
    const row = distMatrix[i];
    for (let j = i + 1; j < n; j++) {
      if (row[j] < min) {
        min = row[j];
      }
    }
  }

  return min;
}

function dist_remove(dist, n, m = n + 1) {
  dist.splice(n, m - n);
  for (let i = dist.length; i-- > 0; ) {
    dist[i].splice(n, m - n);
  }
  return dist;
}

function edgesum(graph, order) {
  if (!order) {
    order = range(graph.nodes().length);
  }

  const inv = inverse_permutation(order);
  const links = graph.links();
  let sum = 0;

  for (let i = 0; i < links.length; i++) {
    const e = links[i];
    const d = Math.abs(inv[e.source.index] - inv[e.target.index]);
    sum += d;
  }
  return sum;
}

/* Fisher-Yates shuffle.
   See http://bost.ocks.org/mike/shuffle/
 */
function randomPermute(array, i = 0, j = array.length) {
  let m = j - i;
  while (m > 0) {
    const k = i + Math.floor(Math.random() * m--);
    const t = array[i + m];
    array[i + m] = array[k];
    array[k] = t;
  }
  return array;
}

function randomPermutation(n) {
  return randomPermute(permutation(n));
}

function random_array(n, min, max) {
  const ret = Array(n);
  if (arguments.length == 1) {
    while (n) {
      ret[--n] = Math.random();
    }
  } else if (arguments.length == 2) {
    while (n) {
      ret[--n] = Math.random() * min;
    }
  } else {
    while (n) {
      ret[--n] = min + Math.random() * (max - min);
    }
  }
  return ret;
}

function random_matrix(p, n, m, sym) {
  if (!m) {
    m = n;
  }
  if (n != m) {
    sym = false;
  } else if (!sym) {
    sym = true;
  }
  const mat = science.zeroes(n, m);

  if (sym) {
    for (let i = 0; i < n; i++) {
      let cnt = 0;
      for (let j = 0; j < i + 1; j++) {
        if (Math.random() < p) {
          mat[i][j] = mat[j][i] = 1;
          cnt++;
        }
      }
      if (cnt === 0) {
        const j = Math.floor((Math.random() * n) / 2);
        mat[i][j] = mat[j][i] = 1;
      }
    }
  } else {
    for (let i = 0; i < n; i++) {
      let cnt = 0;
      for (let j = 0; j < m; j++) {
        if (Math.random() < p) {
          mat[i][j] = 1;
          cnt++;
        }
      }
      if (cnt === 0) {
        mat[i][Math.floor(Math.random() * m)] = 1;
      }
    }
  }
  return mat;
}

function normalize(v) {
  const norm = length(v);
  let i = v.length;
  if (norm === 0 || Math.abs(norm - 1) < 1e-9) {
    return 1;
  }
  while (i-- > 0) {
    v[i] /= norm;
  }
  return norm;
}

function poweriteration(v, eps, init) {
  if (!eps) {
    eps = 1e-9;
  }

  const n = v.length;
  let b;
  let tmp = Array(n);
  let s = 100;

  assert(n == v[0].length, 'poweriteration needs a square matrix');
  if (!init) {
    b = random_array(n);
  } else {
    // copy
    b = init.slice();
  }
  normalize(b);
  while (s-- > 0) {
    for (let i = 0; i < n; i++) {
      tmp[i] = 0;
      for (let j = 0; j < n; j++) {
        tmp[i] += v[i][j] * b[j];
      }
    }
    normalize(tmp);
    if (dot(tmp, b) > 1.0 - eps) {
      break;
    }
    const t = tmp;
    tmp = b;
    b = t; // swap b/tmp
  }
  return tmp;
}

function poweriteration_n(v, p, init, eps, start) {
  if (!eps) {
    eps = 1e-9;
  }

  const n = v.length;
  const b = Array(p);
  let tmp = Array(n);
  let s = 100;
  const eigenvalue = Array(p);

  assert(n == v[0].length, 'poweriteration needs a square matrix');
  if (!init) {
    for (let i = 0; i < p; i++) {
      const row = (b[i] = random_array(n));
      eigenvalue[i] = normalize(row);
    }
  } else {
    for (let i = 0; i < p; i++) {
      b[i] = init[i].slice(); // copy
      eigenvalue[i] = normalize(b[i]);
    }
  }
  if (!start) {
    start = 0;
  }

  for (let k = start; k < p; k++) {
    let bk = b[k];
    while (s-- > 0) {
      // Orthogonalize vector
      for (let l = 0; l < k; l++) {
        const row = b[l];
        const d = dot(bk, row);
        for (let i = 0; i < n; i++) {
          bk[i] -= d * row[i];
        }
      }

      for (let i = 0; i < n; i++) {
        tmp[i] = 0;
        for (let j = 0; j < n; j++) {
          tmp[i] += v[i][j] * bk[j];
        }
      }
      eigenvalue[k] = normalize(tmp);
      if (dot(tmp, bk) > 1 - eps) {
        break;
      }
      bk = tmp;
      tmp = b[k];
      b[k] = bk; // swap b/tmp
    }
    if (exports.debug) {
      console.log('eig[%d]=%j', k, bk);
    }
  }
  return [b, eigenvalue];
}

// Compute the Fiedler vector, the smallest non-null eigenvector of a matrix.
// See:
// Yehuda Koren, Liran Carmel, David Harel
// ACE: A Fast Multiscale Eigenvector Computation for Drawing Huge Graphs
// Extended version, available at:
// http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.19.7702&rep=rep1&type=pdf
// Transform the matrix B to reverse the order of the eigenvectors.
// B' = g . (I - B) where g is the Gershgorin bound, an upper bound
// for (the absolute value of) the largest eigenvalue of a matrix.
// Also, the smallest eigenvector is 1^n

function gershgorin_bound(B) {
  let max = 0;
  const n = B.length;
  for (let i = 0; i < n; i++) {
    const row = B[i];
    let t = row[i];
    for (let j = 0; j < n; j++) {
      if (j != i) {
        t += Math.abs(row[j]);
      }
    }
    if (t > max) {
      max = t;
    }
  }
  if (exports.debug) {
    console.log('gershgorin_bound=%d', max);
  }
  return max;
}

function fiedler_vector(B, eps) {
  const g = gershgorin_bound(B);
  const n = B.length;

  // Copy B
  const Bhat = B.map((row) => row.slice());

  for (let i = 0; i < n; i++) {
    const row = Bhat[i];
    for (let j = 0; j < n; j++) {
      if (i == j) {
        row[j] = g - row[j];
      } else {
        row[j] = -row[j];
      }
    }
  }
  const init = [array1d(n, 1), random_array(n)];
  const eig = poweriteration_n(Bhat, 2, init, eps, 1);
  return eig[0][1];
}

function graph(nodes, links, directed) {
  const graph = {};
  let linkDistance = 1;
  let edges;
  let inEdges;
  let outEdges;
  let components;

  graph.nodes = function (x) {
    if (!arguments.length) {
      return nodes;
    }
    nodes = x;
    return graph;
  };

  graph.nodes_indices = () => nodes.map((n) => n.index);

  graph.generate_nodes = (n) => {
    nodes = [];
    for (let i = 0; i < n; i++) {
      nodes.push({ id: i });
    }
    return graph;
  };

  graph.links = function (x) {
    if (!arguments.length) {
      return links;
    }
    links = x;
    return graph;
  };

  graph.links_indices = () =>
    links.map((l) => ({
      source: l.source.index,
      target: l.target.index,
    }));

  graph.linkDistance = function (x) {
    if (!arguments.length) {
      return linkDistance;
    }
    linkDistance = typeof x === 'function' ? x : +x;
    return graph;
  };

  graph.directed = function (x) {
    if (!arguments.length) {
      return directed;
    }
    directed = x;
    return graph;
  };

  function init() {
    const n = nodes.length;
    const m = links.length;

    components = undefined;
    for (let i = 0; i < n; ++i) {
      const o = nodes[i];
      o.index = i;
      o.weight = 0;
    }

    for (let i = 0; i < m; ++i) {
      const o = links[i];
      o.index = i;
      if (typeof o.source == 'number') {
        o.source = nodes[o.source];
      }
      if (typeof o.target == 'number') {
        o.target = nodes[o.target];
      }
      if (!('value' in o)) {
        o.value = 1;
      }
      o.source.weight++;
      o.target.weight++;
    }

    if (typeof linkDistance === 'function') {
      for (let i = 0; i < m; ++i) {
        links[i].distance = +linkDistance.call(this, links[i], i);
      }
    } else {
      for (let i = 0; i < m; ++i) {
        links[i].distance = linkDistance;
      }
    }

    edges = Array(nodes.length);
    for (let i = 0; i < nodes.length; ++i) {
      edges[i] = [];
    }

    if (directed) {
      inEdges = Array(nodes.length);
      outEdges = Array(nodes.length);
      for (let i = 0; i < nodes.length; ++i) {
        inEdges[i] = [];
        outEdges[i] = [];
      }
    } else {
      inEdges = outEdges = edges;
    }

    for (let i = 0; i < links.length; ++i) {
      const o = links[i];
      edges[o.source.index].push(o);
      if (o.source.index != o.target.index) {
        edges[o.target.index].push(o);
      }
      if (directed) {
        inEdges[o.source.index].push(o);
      }
      if (directed) {
        outEdges[o.target.index].push(o);
      }
    }

    return graph;
  }

  graph.init = init;

  graph.edges = (node) => {
    if (typeof node != 'number') {
      node = node.index;
      if (exports.debug) {
        console.log('received node %d', node);
      }
    }
    return edges[node];
  };

  graph.degree = (node) => {
    if (typeof node != 'number') {
      node = node.index;
    }
    return edges[node].length;
  };

  graph.inEdges = (node) => {
    if (typeof node != 'number') {
      node = node.index;
    }
    return inEdges[node];
  };

  graph.inDegree = (node) => {
    if (typeof node != 'number') {
      node = node.index;
    }
    return inEdges[node].length;
  };

  graph.outEdges = (node) => {
    if (typeof node != 'number') {
      node = node.index;
    }
    return outEdges[node];
  };

  graph.outDegree = (node) => {
    if (typeof node != 'number') {
      node = node.index;
    }
    return outEdges[node].length;
  };

  graph.sinks = () => {
    const sinks = [];
    for (let i = 0; i < nodes.length; i++) {
      if (graph.outEdges(i).length === 0) {
        sinks.push(i);
      }
    }
    return sinks;
  };

  graph.sources = () => {
    const sources = [];
    for (let i = 0; i < nodes.length; i++) {
      if (graph.inEdges(i).length === 0) {
        sources.push(i);
      }
    }
    return sources;
  };

  function distance(i) {
    return links[i].distance;
  }

  graph.distance = distance;

  function neighbors(node) {
    const e = edges[node];
    const ret = [];

    for (const o of e) {
      if (o.source.index == node) {
        ret.push(o.target);
      } else {
        ret.push(o.source);
      }
    }

    return ret;
  }
  graph.neighbors = neighbors;

  graph.other = (o, node) => {
    if (typeof o === 'number') {
      o = links[o];
    }
    if (o.source.index === node) {
      return o.target;
    } else {
      return o.source;
    }
  };

  function compute_components() {
    const stack = [];
    const comps = [];
    const n = nodes.length;

    for (let i = 0; i < n; i++) {
      nodes[i].comp = 0;
    }

    for (let j = 0, comp = 0; j < n; j++) {
      if (nodes[j].comp !== 0) {
        continue;
      }
      comp = comp + 1; // next connected component
      nodes[j].comp = comp;
      stack.push(j);
      const ccomp = [j]; // current connected component list

      while (stack.length) {
        const v = stack.shift();
        const l = edges[v];
        for (let i = 0; i < l.length; i++) {
          const e = l[i];
          let o = e.source;
          if (o.index == v) {
            o = e.target;
          }
          if (o.index == v) {
            continue;
          }
          if (o.comp === 0) {
            o.comp = comp;
            ccomp.push(o.index);
            stack.push(o.index);
          }
        }
      }
      if (ccomp.length) {
        ccomp.sort(cmp_number);
        comps.push(ccomp);
      }
    }
    comps.sort((a, b) => b.length - a.length);
    return comps;
  }

  graph.components = () => {
    if (!components) {
      components = compute_components();
    }
    return components;
  };

  return graph;
}

function permute(list, perm) {
  let m = perm.length;
  const copy = list.slice();
  while (m--) {
    copy[m] = list[perm[m]];
  }
  return copy;
}

function permute_inplace(list, perm) {
  for (let i = 0; i < list.length; i++) {
    let j = perm[i];
    if (j < 0) {
      perm[i] = -1 - j;
      continue;
    }
    let v = i;
    while (j != i) {
      let tmp = list[j];
      list[j] = list[v];
      list[v] = tmp;
      v = j;
      tmp = perm[j];
      perm[j] = -1 - tmp;
      j = tmp;
    }
  }
  return list;
}

function permutetranspose(array, indexes) {
  let m = array.length;
  while (m-- > 0) {
    array[m] = permute(array[m], indexes);
  }
  return array;
}

function permute_matrix(matrix, row_perm, col_perm) {
  if (!col_perm) {
    col_perm = row_perm;
  }
  let permuted = [];
  for (let i = 0; i < matrix.length; i++) {
    permuted.push([]);
    for (let j = 0; j < matrix[0].length; j++) {
      permuted[i].push(matrix[row_perm[i]][col_perm[j]]);
    }
  }
  return permuted;
}

// Converts a graph with weighted edges (weight in l.value)
// into a distance matrix suitable for reordering with e.g.
// Optimal Leaf Ordering.

function distmat2valuemat(distmat) {
  const n = distmat.length;
  const valuemat = science.zeroes(n, n);
  const max_dist = distmax(distmat);

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      valuemat[j][i] = valuemat[i][j] = 1 + max_dist - distmat[i][j];
    }
  }
  return valuemat;
}

function graph2valuemats(graph, comps) {
  if (!comps) {
    comps = graph.components();
  }

  const dists = all_pairs_distance(graph, comps);
  return dists.map(distmat2valuemat);
}

function valuemats_reorder(valuemats, leaforder, comps) {
  let orders = valuemats.map(leaforder);

  if (comps) {
    orders = orders.map((d, i) => permute(comps[i], d));
  }
  return orders.reduce(flatten);
}

function graph2mat(graph, directed) {
  const nodes = graph.nodes();
  const links = graph.links();
  const n = nodes.length;
  let mat;

  if (!directed) {
    directed = graph.directed();
  }
  if (directed) {
    let rows = n;
    let cols = n;

    for (let i = n - 1; i >= 0; i--) {
      if (graph.inEdges(i).length !== 0) {
        break;
      } else {
        rows--;
      }
    }
    for (let i = n - 1; i >= 0; i--) {
      if (graph.outEdges(i).length !== 0) {
        break;
      } else {
        cols--;
      }
    }
    //console.log("Rows: "+rows+" Cols: "+cols);
    mat = science.zeroes(rows, cols);

    for (let i = 0; i < links.length; i++) {
      const l = links[i];
      mat[l.source.index][l.target.index] = l.value ? l.value : 1;
    }
  } else {
    mat = science.zeroes(n, n);

    for (let i = 0; i < links.length; i++) {
      const l = links[i];
      mat[l.source.index][l.target.index] = l.value ? l.value : 1;
      mat[l.target.index][l.source.index] = l.value ? l.value : 1;
    }
  }

  return mat;
}

function graph_empty_nodes(n) {
  const nodes = Array(n);
  for (let i = 0; i < n; i++) {
    nodes[i] = { id: i };
  }
  return nodes;
}

function graph_empty(n, directed) {
  return graph(graph_empty_nodes(n), [], directed);
}

function complete_graph(n, directed) {
  const nodes = graph_empty_nodes(n);
  const links = [];

  if (directed) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i != j) {
          links.push({ source: i, target: j });
        }
      }
    }
  } else {
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        links.push({ source: i, target: j });
      }
    }
  }
  return graph(nodes, links, directed).init();
}

function graph_connect(graph, comps) {
  const links = graph.links();

  if (!comps) {
    comps = graph.components();
  }

  for (let i = 0; i < comps.length - 1; i++) {
    for (let j = i + 1; j < comps.length; j++) {
      links.push({ source: comps[i][0], target: comps[j][0] });
    }
  }
  graph.links(links);
  return graph.init();
}

function graph_random_erdos_renyi(n, p, directed) {
  if (p <= 0) {
    return graph_empty(n, directed);
  } else if (p >= 1) {
    return complete_graph(n, directed);
  }

  const nodes = graph_empty_nodes(n);
  const links = [];

  let w = -1;
  let lp = Math.log(1.0 - p);

  if (directed) {
    for (let v = 0; v < n; ) {
      const lr = Math.log(1.0 - Math.random());
      w = w + 1 + Math.floor(lr / lp);
      if (v == w) {
        w = w + 1;
      }
      while (w >= n && v < n) {
        w = w - n;
        v = v + 1;
        if (v == w) {
          w = w + 1;
        }
      }
      if (v < n) {
        links.push({ source: v, target: w });
      }
    }
  } else {
    for (let v = 1; v < n; ) {
      const lr = Math.log(1.0 - Math.random());
      w = w + 1 + Math.floor(lr / lp);
      while (w >= v && v < n) {
        w = w - v;
        v = v + 1;
      }
      if (v < n) {
        links.push({ source: v, target: w });
      }
    }
  }
  return graph(nodes, links, directed).init();
}

const graph_random = graph_random_erdos_renyi;

// This is a modified implementation of hcluster derived from:
// https://github.com/jasondavies/science.js/blob/master/src/stats/hcluster.js
function hcluster() {
  let distance$1 = distance.euclidean;

  // single, complete or average
  let linkage = 'single';

  let distMatrix = null;

  function hcluster(vectors) {
    const n = vectors.length;
    const dMin = [];
    const cSize = [];
    const clusters = [];

    let root;
    let id = 0;

    // Initialise distance matrix and vector of closest clusters.
    if (distMatrix === null) {
      distMatrix = [];
      let i = -1;
      while (++i < n) {
        dMin[i] = 0;
        distMatrix[i] = [];
        let j = -1;
        while (++j < n) {
          distMatrix[i][j] =
            i === j ? Infinity : distance$1(vectors[i], vectors[j]);
          if (distMatrix[i][dMin[i]] > distMatrix[i][j]) {
            dMin[i] = j;
          }
        }
      }
    } else {
      if (distMatrix.length < n || distMatrix[0].length < n) {
        throw {
          error: `Provided distance matrix length ${distMatrix.length} instead of ${n}`,
        };
      }
      let i = -1;
      while (++i < n) {
        dMin[i] = 0;
        let j = -1;
        while (++j < n) {
          if (i === j) {
            distMatrix[i][j] = Infinity;
          }
          if (distMatrix[i][dMin[i]] > distMatrix[i][j]) {
            dMin[i] = j;
          }
        }
      }
    }
    // create leaves of the tree
    let i = -1;
    while (++i < n) {
      if (i != id) {
        console.log('i = %d, id = %d', i, id);
      }
      clusters[i] = [];
      clusters[i][0] = {
        left: null,
        right: null,
        dist: 0,
        centroid: vectors[i],
        id: id++, //[jdf] keep track of original data index
        size: 1,
        depth: 0,
      };
      cSize[i] = 1;
    }

    // Main loop
    for (let p = 0; p < n - 1; p++) {
      // find the closest pair of clusters
      let c1 = 0;
      for (i = 0; i < n; i++) {
        if (distMatrix[i][dMin[i]] < distMatrix[c1][dMin[c1]]) {
          c1 = i;
        }
      }
      const c2 = dMin[c1];

      // create node to store cluster info
      const c1Cluster = clusters[c1][0];
      const c2Cluster = clusters[c2][0];

      const newCluster = {
        left: c1Cluster,
        right: c2Cluster,
        dist: distMatrix[c1][c2],
        centroid: calculateCentroid(
          c1Cluster.size,
          c1Cluster.centroid,
          c2Cluster.size,
          c2Cluster.centroid
        ),
        id: id++,
        size: c1Cluster.size + c2Cluster.size,
        depth: 1 + Math.max(c1Cluster.depth, c2Cluster.depth),
      };
      clusters[c1].splice(0, 0, newCluster);
      cSize[c1] += cSize[c2];

      // overwrite row c1 with respect to the linkage type
      for (let j = 0; j < n; j++) {
        switch (linkage) {
          case 'single':
            if (distMatrix[c1][j] > distMatrix[c2][j]) {
              distMatrix[j][c1] = distMatrix[c1][j] = distMatrix[c2][j];
            }
            break;
          case 'complete':
            if (distMatrix[c1][j] < distMatrix[c2][j]) {
              distMatrix[j][c1] = distMatrix[c1][j] = distMatrix[c2][j];
            }
            break;
          case 'average':
            distMatrix[j][c1] = distMatrix[c1][j] =
              (cSize[c1] * distMatrix[c1][j] + cSize[c2] * distMatrix[c2][j]) /
              (cSize[c1] + cSize[j]);
            break;
        }
      }
      distMatrix[c1][c1] = Infinity;

      for (let i = 0; i < n; i++) {
        distMatrix[i][c2] = distMatrix[c2][i] = Infinity;
      }

      // update dmin and replace ones that previous pointed to c2 to point to c1
      for (let j = 0; j < n; j++) {
        if (dMin[j] == c2) {
          dMin[j] = c1;
        }
        if (distMatrix[c1][j] < distMatrix[c1][dMin[c1]]) {
          dMin[c1] = j;
        }
      }

      // keep track of the last added cluster
      root = newCluster;
    }

    return root;
  }

  hcluster.linkage = function (x) {
    if (!arguments.length) {
      return linkage;
    }
    linkage = x;
    return hcluster;
  };

  hcluster.distance = function (x) {
    if (!arguments.length) {
      return distance$1;
    }
    distance$1 = x;
    return hcluster;
  };

  hcluster.distanceMatrix = function (x) {
    if (!arguments.length) {
      return distMatrix;
    }
    distMatrix = x.map((y) => y.slice(0));
    return hcluster;
  };

  return hcluster;
}

function calculateCentroid(c1Size, c1Centroid, c2Size, c2Centroid) {
  const newCentroid = [];
  const newSize = c1Size + c2Size;
  const n = c1Centroid.length;
  let i = -1;
  while (++i < n) {
    newCentroid[i] =
      (c1Size * c1Centroid[i] + c2Size * c2Centroid[i]) / newSize;
  }
  return newCentroid;
}

function intersect_sorted_ints(a, b) {
  let ai = 0;
  let bi = 0;
  const result = [];

  while (ai < a.length && bi < b.length) {
    if (a[ai] < b[bi]) {
      ai++;
    } else if (a[ai] > b[bi]) {
      bi++;
    } else {
      /* they're equal */
      result.push(ai);
      ai++;
      bi++;
    }
  }

  return result;
}

function laplacian(graph, comp) {
  const n = comp.length;
  const lap = science.zeroes(n, n);
  const inv = inverse_permutation(comp);

  assert(!graph.directed(), 'Laplacian only for undirected graphs');
  for (let i = 0; i < n; i++) {
    const v = comp[i];
    const row = lap[i];
    let sum = 0;
    const edges = graph.edges(v);
    for (let j = 0; j < edges.length; j++) {
      const e = edges[j];
      const other = inv[graph.other(e, v).index];
      if (other != i) {
        sum += e.value;
        row[other] = -e.value;
      }
    }
    row[i] = sum;
  }

  return lap;
}

/*
 * Linear arrangement
 * The sum of: for each edge: the distance in the ordering between the endpoints
 *
 * @matrix: a permuted matrix
 */
function linear_arrangement(matrix) {
  let linarr = 0;
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[0].length; j++) {
      if (i !== j && matrix[i][j] > 0) {
        linarr += Math.abs(i - j);
      }
    }
  }
  return linarr;
}

function mat2graph(mat, directed) {
  const n = mat.length;
  const nodes = [];
  const links = [];
  let max_value = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < n; i++) {
    nodes.push({ id: i });
  }

  for (let i = 0; i < n; i++) {
    const v = mat[i];
    const m = directed ? 0 : i;

    for (let j = m; j < v.length; j++) {
      if (j == nodes.length) {
        nodes.push({ id: j });
      }
      if (v[j] !== 0) {
        if (v[j] > max_value) {
          max_value = v[j];
        }
        links.push({ source: i, target: j, value: v[j] });
      }
    }
  }
  return graph(nodes, links, directed)
    .linkDistance((l) => 1 + max_value - l.value)
    .init();
}

function meantranspose(v, j) {
  const n = v.length;
  if (n === 0) {
    return NaN;
  }
  let m = 0;
  let i = -1;

  while (++i < n) {
    m += (v[i][j] - m) / (i + 1);
  }

  return m;
}

function meancolumns(v) {
  const n = v.length;
  if (n === 0) {
    return NaN;
  }
  const o = v[0].length;
  const m = v[0].slice(0);
  let i = 0;

  while (++i < n) {
    const row = v[i];
    for (let j = 0; j < o; j++) {
      m[j] += (row[j] - m[j]) / (i + 1);
    }
  }

  return m;
}

/* Compute Moran's I of a permuted matrix using Rook's adjacency
 * For implementation details see paper below
 *
 * Simultaneous Matrix Orderings for Graph Collections.
 * Nathan van Beusekom, Wouter Meulemans, and Bettina Speckmann.
 * IEEE Transactions on Visualization and Computer Graphics, 28(1), pp 1-10, 2021.
 * https://arxiv.org/abs/2109.12050
 *
 * @matrix: a permuted matrix
 */
function morans_i(matrix) {
  // N is the number of cells, W is the number of adjacencies, mean is the mean value.
  const N = matrix.length * matrix.length;
  const W =
    (matrix.length - 2) * (matrix.length - 2) * 4 +
    (matrix.length - 2) * 3 * 2 +
    (matrix.length - 2) * 3 * 2 +
    8;
  let m = 0;
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[0].length; j++) {
      m += matrix[i][j];
    }
  }
  const mean = m / N;

  let num = 0,
    denom = 0;
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[0].length; j++) {
      denom += Math.pow(matrix[i][j] - mean, 2);
      let innersum = 0;
      for (
        let x = Math.max(0, i - 1);
        x < Math.min(matrix.length, i + 2);
        x++
      ) {
        for (
          let y = Math.max(0, j - 1);
          y < Math.min(matrix[0].length, j + 2);
          y++
        ) {
          if (x !== i || y !== j) {
            // Not Counting Diagonal Neighbours: Rook's adjacency (Recommended)
            if (j - y >= -1 && j - y <= 1 && i === x) {
              innersum += (matrix[i][j] - mean) * (matrix[x][y] - mean);
            }
            if (j === y && i - x >= -1 && i - x <= 1) {
              innersum += (matrix[i][j] - mean) * (matrix[x][y] - mean);
            }

            // Counting Diagonal Neighbours: Queen's adjacency
            // (When uncommenting this code, W should be adapted accordingly and the Rook's adjacency code should be commented)
            /*
                        if(i - x >= -1 && i - x <= 1 && y - j >= -1 && y - j <= 1){
                            innersum += (matrix[j][i] - mean) * (matrix[y][x] - mean);
                        }
                        */
          }
        }
      }
      num += innersum;
    }
  }

  // The case where every value is zero:
  if (num === 0 && denom === 0) {
    return 1;
  }

  return (N / W) * (num / denom);
}

// TODO Cite simult
// Accorging to
// E. R. Gansner, E. Koutsofios, S. C. North, and K.-P. Vo. 1993. A
// Technique for Drawing Directed Graphs. IEEE Trans. Softw. Eng. 19, 3
// (March 1993), 214-230. DOI=10.1109/32.221135
// http://dx.doi.org/10.1109/32.221135
// page 14: "[...] reduce obvious crossings after the vertices have
// been sorted, transforming a given ordering to one that is locally
// optimal with respect to transposition of adjacent vertices. It
// typically provides an additional 20-50% reduction in edge crossings.

function count_all_in_crossings(graphs, a, b, layer) {
  let sum = 0;
  for (let i = 0; i < graphs.length; i++) {
    sum += count_in_crossings(graphs[i], a, b, layer);
  }
  return sum;
}
function count_all_out_crossings(graphs, a, b, layer) {
  let sum = 0;
  for (let i = 0; i < graphs.length; i++) {
    sum += count_out_crossings(graphs[i], a, b, layer);
  }
  return sum;
}

/**
 * Optimize two layers by swapping adjacent nodes when
 * it reduces the number of crossings.
 * @param {Graph} graphs - the graph these two layers belong to
 * @param {list} layer1 - the ordered list of nodes in layer 1
 * @param {list} layer2 - the ordered list of nodes in layer 2
 * @returns {list} a tuple containing the new layer1, layer2, and crossings count
 */
function mult_adjacent_exchange(graphs, layer1, layer2) {
  layer1 = layer1.slice();
  layer2 = layer2.slice();
  const inv_layer1 = inverse_permutation(layer1);
  const inv_layer2 = inverse_permutation(layer2);
  let swapped = true;
  let improved = 0;

  while (swapped) {
    swapped = false;
    for (let i = 0; i < layer1.length - 1; i++) {
      const v = layer1[i];
      const w = layer1[i + 1];
      const c0 = count_all_out_crossings(graphs, v, w, inv_layer2);
      const c1 = count_all_out_crossings(graphs, w, v, inv_layer2);
      if (c0 > c1) {
        layer1[i] = w;
        layer1[i + 1] = v;
        inv_layer1[w] = i;
        inv_layer1[v] = i + 1;
        swapped = true;
        improved += c0 - c1;
      }
    }
    for (let i = 0; i < layer2.length - 1; i++) {
      const v = layer2[i];
      const w = layer2[i + 1];
      const c0 = count_all_in_crossings(graphs, v, w, inv_layer1);
      const c1 = count_all_in_crossings(graphs, w, v, inv_layer1);
      if (c0 > c1) {
        layer2[i] = w;
        layer2[i + 1] = v;
        inv_layer2[w] = i;
        inv_layer2[v] = i + 1;
        swapped = true;
        improved += c0 - c1;
      }
    }
  }

  return [layer1, layer2, improved];
}

function mult_barycenter_order(graphs, comps, max_iter) {
  let orders = [[], [], 0];
  comps = graphs[0].components();
  const o = mult_barycenter(graphs, comps.flat(), max_iter);
  orders = [orders[0].concat(o[0]), orders[1].concat(o[1]), orders[2] + o[2]];
  return orders;
}

// Take the list of neighbor indexes and return the median according to
// P. Eades and N. Wormald, Edge crossings in drawings of bipartite graphs.
// Algorithmica, vol. 11 (1994) 379â€“403.
function median(neighbors) {
  if (neighbors.length === 0) {
    return 0;
  } // Place on end
  if (neighbors.length === 1) {
    return neighbors[0];
  }
  if (neighbors.length === 2) {
    return (neighbors[0] + neighbors[1]) / 2;
  }
  neighbors.sort(cmp_number);
  if (neighbors.length % 2) {
    return neighbors[(neighbors.length - 1) / 2];
  }
  const rm = neighbors.length / 2;
  const lm = rm - 1;
  const rspan = neighbors[neighbors.length - 1] - neighbors[rm];
  const lspan = neighbors[lm] - neighbors[0];
  if (lspan == rspan) {
    return (neighbors[lm] + neighbors[rm]) / 2;
  } else {
    return (neighbors[lm] * rspan + neighbors[rm] * lspan) / (lspan + rspan);
  }
}

function count_all_crossings(graphs, layer1, layer2) {
  let sum = 0;
  for (let i = 0; i < graphs.length; i++) {
    let c = count_crossings(graphs[i], layer1, layer2);
    sum += c;
  }
  return sum;
}

function mult_barycenter(graphs, comp, max_iter) {
  let nodes = graphs[0].nodes();
  let crossings;
  let iter;
  let layer;
  let neighbors;
  let med;
  let directed = false;

  let layer1 = comp.filter((n) => {
    for (let i = 0; i < graphs.length; i++) {
      if (graphs[i].outDegree(n) !== 0) {
        return true;
      }
      return false;
    }
  });
  let layer2 = comp.filter((n) => {
    for (let i = 0; i < graphs.length; i++) {
      if (graphs[i].inDegree(n) !== 0) {
        return true;
      }
      return false;
    }
  });

  for (let i = 0; i < graphs.length; i++) {
    if (graphs[i].directed()) {
      directed = true;
    }
  }
  // If the layers are equal, we want to modify them simultaneously (for undirected graphs)
  if (!directed) {
    layer1 = layer2;
  }

  if (comp.length < 3) {
    return [layer1, layer2, count_all_crossings(graphs, layer1, layer2)];
  }

  if (!max_iter) {
    max_iter = 24;
  } else if (max_iter % 2 == 1) {
    max_iter++;
  } // want even number of iterations

  let inv_layer = inverse_permutation(layer2);

  let best_crossings = count_all_crossings(graphs, layer1, layer2);
  let best_layer1 = layer1.slice();
  let best_layer2 = layer2.slice();
  let best_iter = 0;

  let v;
  const inv_neighbor = (e) =>
    inv_layer[e.source == v ? e.target.index : e.source.index];

  function barycenter_sort(graph) {
    return (a, b) => {
      let d = med[a] - med[b];
      if (d === 0) {
        // If both values are equal,
        // place the odd degree vertex on the left of the even
        // degree vertex
        d = (graph.edges(b).length % 2) - (graph.edges(a).length % 2);
      }
      if (d < 0) {
        return -1;
      } else if (d > 0) {
        return 1;
      }
      return 0;
    };
  }
  for (
    layer = layer1, iter = 0;
    iter < max_iter;
    iter++, layer = layer == layer1 ? layer2 : layer1
  ) {
    med = {};
    // Compute median of medians
    for (let t = 0; t < graphs.length; t++) {
      nodes = graphs[t].nodes();
      for (let i = 0; i < layer.length; i++) {
        v = nodes[layer[i]];
        if (t === 0) {
          med[v.index] = [];
        }
        if (layer == layer1) {
          neighbors = graphs[t].outEdges(v.index);
        } else {
          neighbors = graphs[t].inEdges(v.index);
        }
        neighbors = neighbors.map(inv_neighbor);
        if (neighbors.length > 0) {
          med[v.index].push(+median(neighbors));
        }
      }
    }
    nodes = graphs[0].nodes();
    for (let i = 0; i < layer.length; i++) {
      v = nodes[layer[i]];
      if (med[v.index].length > 0) {
        med[v.index] = median(med[v.index]); // d3 or this median?
      } else {
        med[v.index] = 0;
      }
    }

    layer.sort(barycenter_sort(graphs[0])); // ?? TODO
    for (let i = 0; i < layer.length; i++) {
      inv_layer = inverse_permutation(layer);
    }
    crossings = count_all_crossings(graphs, layer1, layer2);
    if (crossings < best_crossings) {
      best_crossings = crossings;
      best_layer1 = layer1.slice();
      best_layer2 = layer2.slice();
      best_iter = iter;
      max_iter = Math.max(max_iter, iter + 2); // we improved so go on
    }
  }
  if (exports.debug) {
    console.log(`Best iter: ${best_iter}`);
  }
  return [best_layer1, best_layer2, best_crossings];
}

/*
 * Distance computation based on multiple matrices (not squared)
 *
 * Simultaneous Matrix Orderings for Graph Collections.
 * Nathan van Beusekom, Wouter Meulemans, and Bettina Speckmann.
 * IEEE Transactions on Visualization and Computer Graphics, 28(1), pp 1-10, 2021.
 * https://arxiv.org/abs/2109.12050
 */
function mult_dist() {
  let distance$1 = distance.euclidean;

  function mult_dist(matrices, distances) {
    const n = matrices.length;

    const res = [];
    for (let i = 0; i < matrices[0].length; i++) {
      const newrow = [];
      for (let j = 0; j < matrices[0][0].length; j++) {
        newrow.push(0);
      }
      res.push(newrow);
    }
    for (let k = 0; k < n; k++) {
      distance$1 = distances[k];
      let distMatrix = [];
      const vector = matrices[k];
      const n1 = vector.length;
      for (let i = 0; i < n1; i++) {
        const d = [];
        distMatrix[i] = d;
        for (let j = 0; j < n1; j++) {
          if (j < i) {
            d[j] = distMatrix[j][i];
          } else if (i === j) {
            d[j] = 0;
          } else {
            d[j] = distance$1(vector[i], vector[j]);
          }
        }
      }
      for (let i = 0; i < distMatrix.length; i++) {
        for (let j = 0; j < distMatrix[0].length; j++) {
          res[i][j] += distMatrix[i][j];
        }
      }
    }
    return res;
  }

  mult_dist.distance = function (x) {
    if (!arguments.length) {
      return distance$1;
    }
    distance$1 = x;
    return mult_dist;
  };

  return mult_dist;
}

function nn_2opt() {
  let distanceMatrix = null;
  let distance$1 = distance.euclidean;
  let epsilon = 0.0001;

  nn_2opt.distance = function (x) {
    if (!arguments.length) {
      return distance$1;
    }
    distance$1 = x;
    distanceMatrix = null;
    return nn_2opt;
  };

  nn_2opt.distance_matrix = function (x) {
    if (!arguments.length) {
      return distanceMatrix;
    }
    // copy
    distanceMatrix = x.map((y) => y.slice(0));
    return nn_2opt;
  };

  function nn_2opt(matrix) {
    if (distanceMatrix === null) {
      distanceMatrix = dist().distance(distance$1)(matrix);
    }
    let lowest_dist_all = Number.MAX_VALUE;
    let best_order_all = [];
    
    // Try each row as the initial permutation for NN-2OPT
    for (let s = 0; s < distanceMatrix.length; s++) {
      let order = [];
      order.push(s);
      // NN
      while (order.length < distanceMatrix.length) {
        let nearest = -1;
        for (let i = 0; i < distanceMatrix.length; i++) {
          if (!order.includes(i)) {
            let last = order[order.length - 1];
            if (nearest === -1) {
              nearest = i;
            } else if (
              distanceMatrix[last][i] < distanceMatrix[last][nearest]
            ) {
              nearest = i;
            }
          }
        }
        order.push(nearest);
      }
      let newdist = getTotal(order);
      let olddist = newdist - (epsilon + 1);
      // 2-OPT
      let lowest_dist_2opt = Number.MAX_VALUE;
      let best_order_2opt = [];
      while (newdist - olddist > epsilon) {
        for (let i = 0; i < order.length; i++) {
          for (let j = i + 2; j < order.length - 1; j++) {
            // edge 1: (i,i+1) edge2: (j,j+1)
            let currentd = distanceMatrix[order[i]][order[i + 1]] + distanceMatrix[order[j]][order[j + 1]];
            let candidated = distanceMatrix[order[i]][order[j]] + distanceMatrix[order[i + 1]][order[j + 1]];
            if (candidated < currentd) {               
              let check = [];
              for (let k = 0; k < order.length; k++) {
                check[k] = order[k];
              }
              // Reverse i+1 to j
              for (let k = 0; k <= j - (i + 1); k++) {
                check[i + 1 + k] = order[j - k];
              }
              order = check;
            }
          }
        }
        olddist = newdist;
        newdist = getTotal(order);
        if (newdist < lowest_dist_2opt) {
          lowest_dist_2opt = newdist;
          best_order_2opt = order;
        }
      }
      if (lowest_dist_2opt < lowest_dist_all) {
          lowest_dist_all = lowest_dist_2opt;
          best_order_all = best_order_2opt;
        }
    }
    return best_order_all;
  }

  function getTotal(order) {
    let sum = 0;
    for (let i = 0; i < order.length - 1; i++) {
      sum += distanceMatrix[order[i]][order[i + 1]];
    }
    return sum;
  }

  nn_2opt.distance = function (x) {
    if (!arguments.length) {
      return distance$1;
    }
    distance$1 = x;
    distanceMatrix = null;
    return nn_2opt;
  };

  nn_2opt.distanceMatrix = nn_2opt.distance_matrix; // compatability

  return nn_2opt;
}

/**
 * optimal dendrogram ordering
 *
 * implementation of binary tree ordering described in [Bar-Joseph et al., 2003]
 * by Renaud Blanch.
 * JavaScript translation by Jean-Daniel Fekete.
 *
 * [Bar-Joseph et al., 2003]
 * K-ary Clustering with Optimal Leaf Ordering for Gene Expression Data.
 * Ziv Bar-Joseph, Erik D. Demaine, David K. Gifford, Angèle M. Hamel,
 * Tommy S. Jaakkola and Nathan Srebro
 * Bioinformatics, 19(9), pp 1070-8, 2003
 * http://www.cs.cmu.edu/~zivbj/compBio/k-aryBio.pdf
 */

function optimal_leaf_order() {
  let distanceMatrix = null;
  let distance$1 = distance.euclidean;
  let linkage = 'complete';
  let leavesMap = {};
  let orderMap = {};

  function leaves(n) {
    if (n === null) {
      return [];
    }
    if (n.id in leavesMap) {
      return leavesMap[n.id];
    }
    return (leavesMap[n.id] = _leaves(n));
  }

  function _leaves(n) {
    if (n === null) {
      return [];
    }
    if (n.depth === 0) {
      return [n.id];
    }
    return leaves(n.left).concat(leaves(n.right));
  }

  function order(v, i, j) {
    const key = `k${v.id}-${i}-${j}`; // ugly key
    if (key in orderMap) {
      return orderMap[key];
    }
    return (orderMap[key] = _order(v, i, j));
  }

  function _order(v, i, j) {
    if (v.depth === 0) {
      return [0, [v.id]];
    }
    const l = v.left;
    const r = v.right;
    const L = leaves(l);
    const R = leaves(r);

    let w, x;
    if (L.includes(i) && R.includes(j)) {
      w = l;
      x = r;
    } else if (R.includes(i) && L.includes(j)) {
      w = r;
      x = l;
    } else {
      throw { error: `Node is not common ancestor of ${i}, ${j}` };
    }
    const Wl = leaves(w.left);
    const Wr = leaves(w.right);
    let Ks = Wr.includes(i) ? Wl : Wr;
    if (Ks.length === 0) {
      Ks = [i];
    }

    const Xl = leaves(x.left);
    const Xr = leaves(x.right);
    let Ls = Xr.includes(j) ? Xl : Xr;
    if (Ls.length === 0) {
      Ls = [j];
    }

    let min = Infinity;
    let optimal_order = [];

    for (let k = 0; k < Ks.length; k++) {
      const w_min = order(w, i, Ks[k]);
      for (let m = 0; m < Ls.length; m++) {
        const x_min = order(x, Ls[m], j);
        const dist = w_min[0] + distanceMatrix[Ks[k]][Ls[m]] + x_min[0];
        if (dist < min) {
          min = dist;
          optimal_order = w_min[1].concat(x_min[1]);
        }
      }
    }
    return [min, optimal_order];
  }

  function orderFull(v) {
    leavesMap = {};
    orderMap = {};
    let min = Infinity;
    let optimal_order = [];
    const left = leaves(v.left);
    const right = leaves(v.right);

    if (exports.debug) {
      console.log(printhcluster(v, 0));
    }

    for (let i = 0; i < left.length; i++) {
      for (let j = 0; j < right.length; j++) {
        const so = order(v, left[i], right[j]);
        if (so[0] < min) {
          min = so[0];
          optimal_order = so[1];
        }
      }
    }
    distanceMatrix = null;
    return optimal_order;
  }

  function optimal_leaf_order(matrix) {
    if (distanceMatrix === null) {
      distanceMatrix = dist().distance(distance$1)(matrix);
    }
    const cluster = hcluster().linkage(linkage).distanceMatrix(distanceMatrix);
    return orderFull(cluster(matrix));
  }
  optimal_leaf_order.order = orderFull;
  optimal_leaf_order.reorder = optimal_leaf_order;

  optimal_leaf_order.distance = function (x) {
    if (!arguments.length) {
      return distance$1;
    }
    distance$1 = x;
    distanceMatrix = null;
    return optimal_leaf_order;
  };

  optimal_leaf_order.linkage = function (x) {
    if (!arguments.length) {
      return linkage;
    }
    linkage = x;
    return optimal_leaf_order;
  };

  optimal_leaf_order.distance_matrix = function (x) {
    if (!arguments.length) {
      return distanceMatrix;
    }
    // copy
    distanceMatrix = x.map((y) => y.slice(0));
    return optimal_leaf_order;
  };
  optimal_leaf_order.distanceMatrix = optimal_leaf_order.distance_matrix; // compatibility

  return optimal_leaf_order;
}

function order() {
  let distance$1 = distance.euclidean;
  let ordering = optimal_leaf_order;
  let linkage = 'complete';
  let distanceMatrix = null;
  let vector;
  let except = [];
  let _debug = 0;
  let i = 0;
  let j = Infinity;

  function _reset() {
    distance$1 = distance.euclidean;
    ordering = optimal_leaf_order;
    linkage = 'complete';
    distanceMatrix = null;
    vector = null;
    except = [];
    i = 0;
    j = Infinity;
  }

  function debug(v) {
    if (arguments.length != 0) {
      _debug = v;
    }
    return _debug;
  }

  function order(v) {
    vector = v;
    j = Math.min(j, v.length);
    let i0 = i > 0 ? i - 1 : 0;
    let j0 = j < vector.length ? j + 1 : j;

    for (let k = except.length - 1; k > 0; k -= 2) {
      let low = except[k - 1];
      let high = except[k];
      if (high >= j0) {
        if (j0 > j) {
          j0 = Math.min(j0, low + 1);
          except.splice(k - 1, 2);
        } else {
          high = j0;
        }
      } else if (low <= i0) {
        if (i0 < i) {
          i0 = Math.max(i0, high - 1);
          except.splice(k - 1, 2);
        } else {
          low = i0;
        }
      } else if (high - low < 3) {
        except.splice(k - 1, 2);
      }
    }

    try {
      return _order_limits(i0, j0);
    } finally {
      _reset();
    }
  }

  function _order_limits(i0, j0) {
    const orig = vector;

    vector = vector.slice(i0, j0); // always make a copy
    if (i === 0 && j == vector.length) {
      return _order_except();
    }

    if (_debug) {
      console.log(`i0=${i0} j0=${j0}`);
    }

    if (distanceMatrix !== null) {
      if (j0 !== vector.length) {
        dist_remove(distanceMatrix, j0, vector.length);
      }
      if (i0 > 0) {
        dist_remove(distanceMatrix, 0, i0);
      }
    } else {
      _compute_dist();
    }
    // Apply constraints on the min/max indices

    let max = distmax(distanceMatrix);
    if (i0 < i) {
      // row i0 should be far away from each rows so move it away
      // by changing the distance matrix, adding "max" to each
      // distance from row/column 0
      const row = distanceMatrix[0];
      for (let k = row.length; k-- > 1; ) {
        row[k] += max;
      }
      for (let k = distanceMatrix.length; k-- > 1; ) {
        distanceMatrix[k][0] += max;
      }
      max += max;
      // also fix the exception list
      if (i0 !== 0) {
        for (let k = 0; k < except.length; k++) {
          except[k] -= i0;
        }
      }
    }
    if (j0 > j) {
      // move j0 even farther so that
      // i0 and j0 are farthest from each other.
      // add 2*max to each distance from row/col
      // j-i-1
      const l = distanceMatrix.length - 1;
      const row = distanceMatrix[l];
      for (let k = l; k-- > 0; ) {
        row[k] += max;
        distanceMatrix[k][l] += max;
      }
    }
    // the algorithm should work as is, except
    // the order can be reversed in the end.

    let perm = _order_except();
    if (i0 < i) {
      if (perm[0] !== 0) {
        perm.reverse();
      }
      if (j0 > j) {
        assert(
          perm[0] === 0 && perm[perm.length - 1] == perm.length - 1,
          'Invalid constrained permutation endpoints'
        );
      } else {
        assert(perm[0] === 0, 'Invalid constrained permutation start');
      }
    } else if (j0 > j) {
      if (perm[perm.length - 1] !== perm.length - 1) {
        perm = perm.reverse();
      }
      assert(
        perm[perm.length - 1] == perm.length - 1,
        'Invalid constrained permutation end'
      );
    }
    if (i0 !== 0) {
      perm = permutation(i0).concat(perm.map((v) => v + i0));
    }
    if (orig.length > j0) {
      perm = perm.concat(range(j0, orig.length));
    }
    return perm;
  }

  function _order_except() {
    let perm, k, l, low, high, pos;

    if (except.length === 0) {
      return _order_equiv();
    }

    // TODO: postpone the calculation to avoid computing the except items
    _compute_dist();
    // Apply constaints on the fixed order between the indices
    // in "except"
    // We do it end-to-start to keep the indices right

    for (k = except.length - 1; k > 0; k -= 2) {
      low = except[k - 1];
      high = except[k];
      distanceMatrix = dist_remove(distanceMatrix, low + 1, high - 1);
      vector.splice(low + 1, high - low - 2);
      if (_debug) {
        console.log(`Except[${low}, ${high}]`);
      }
      if (distanceMatrix[low][low + 1] !== 0) {
        // boundaries are equal, they will survive
        distanceMatrix[low][low + 1] = distanceMatrix[low + 1][low] = -1;
      }
    }

    perm = _order_equiv();

    // put back except ranges
    //TODO
    for (k = 0; k < except.length; k += 2) {
      low = except[k];
      high = except[k + 1];
      // Prepare for inserting range [low+1,high-1]
      for (l = 0; l < perm.length; l++) {
        if (perm[l] > low) {
          perm[l] += high - low - 2;
        } else if (perm[l] == low) {
          pos = l;
        }
      }
      if (pos > 0 && perm[pos - 1] == high - 1) {
        // reversed order
        Array.prototype.splice.apply(
          perm,
          [pos, 0].concat(range(high - 2, low, -1))
        );
      } else if (perm[pos + 1] == high - 1) {
        Array.prototype.splice.apply(
          perm,
          [pos + 1, 0].concat(range(low + 1, high - 1))
        );
      } else {
        throw 'Range not respected';
      }
    }

    return perm;
  }

  function _order_equiv() {
    let perm;
    let row;
    let e;
    let j;
    let k;
    let l;
    let m;
    let n;
    let has_1 = false;
    const equiv = [];
    const fix_except = {};

    _compute_dist();

    // Collect nodes with distance==0 in equiv table
    // At this stage, exceptions are stored with -1
    for (k = 0; k < distanceMatrix.length - 1; k++) {
      row = distanceMatrix[k];
      e = [];
      j = row.indexOf(-1);
      if (j !== -1) {
        fix_except[k] = [k, j]; // keep track for later fix
        has_1 = true;
      }
      // top down to keep the indices
      for (l = row.length; --l > k; ) {
        if (row[l] === 0) {
          j = distanceMatrix[l].indexOf(-1);
          if (j !== -1) {
            // move the constraint to the representative
            // of the equiv. class "k"
            fix_except[k] = [l, j]; // keep track for later fix
            distanceMatrix[j][k] = row[j] = -1;
            has_1 = true;
          }
          e.unshift(l);
          // remove equivalent item from dist and vector
          distanceMatrix = dist_remove(distanceMatrix, l);
          vector.splice(l, 1);
        } else if (row[l] < 0) {
          has_1 = true;
        }
      }
      if (e.length !== 0) {
        e.unshift(k);
        equiv.push(e);
      }
    }

    if (has_1) {
      for (k = 0; k < distanceMatrix.length - 1; k++) {
        row = distanceMatrix[k];
        for (l = k + 1; l < row.length - 1; l++) {
          if (distanceMatrix[l][l + 1] == -1) {
            distanceMatrix[l + 1][l] = distanceMatrix[l][l + 1] = 0;
          }
        }
      }
    }

    perm = _order();

    // put back equivalent rows
    for (k = equiv.length; k-- > 0; ) {
      e = equiv[k];
      l = perm.indexOf(e[0]);
      m = fix_except[e[0]];
      if (m && m[0] == e[0]) {
        l = _fix_exception(perm, l, m[0], m[1], 0);
        m = undefined;
      }
      for (n = 1; n < e.length; n++) {
        perm = _perm_insert(perm, l, e[n]);
        if (m && m[0] == e[n]) {
          l = _fix_exception(perm, l, m[0], m[1], n);
          m = undefined;
        }
      }
    }
    // // put back equivalent rows
    // //TODO fix index that varies when insertions are done in the perm
    // for (k = equiv.length; k-- > 0; ) {
    //     e = equiv[k];
    //     l = perm.indexOf(e[0]);
    // }
    return perm;
  }

  function _fix_exception(perm, l, m, next, len) {
    // let i, j, k;
    // for (k = 0; k < except.length; k += 2) {
    //     if (m == except[k]) {
    //         next = m+1;
    //         break;
    //     }
    //     else if (m == except[k]+1) {
    //         next = m-1;
    //         break;
    //     }
    // }
    // if (next == 0) {
    //     throw "Exception not found";
    //     return;
    // }

    if (l > 0 && perm[l - 1] == next) {
      _swap(perm, l, perm.indexOf(m));
      return l + 1;
    } else if (perm[l + len + 1] == next) {
      _swap(perm, l + len, perm.indexOf(m));
      return l;
    } else {
      throw 'Index not found';
    }
  }

  function _swap(perm, a, b) {
    if (a == b) {
      return;
    }
    const c = perm[a];
    perm[a] = perm[b];
    perm[b] = c;
  }

  function _order() {
    if (_debug > 1) {
      printmat(distanceMatrix);
    }
    if (_debug > 2) {
      printmat(vector);
    }

    const perm = ordering().linkage(linkage).distanceMatrix(distanceMatrix)(
      vector
    );
    if (_debug) {
      console.log(`Permutation: ${perm}`);
    }

    return perm;
  }

  function _perm_insert(perm, i, nv) {
    perm = perm.map((v) => (v < nv ? v : v + 1));
    perm.splice(i, 0, nv);
    return perm;
  }

  function _compute_dist() {
    if (distanceMatrix === null) {
      distanceMatrix = dist().distance(distance$1)(vector);
    }
    return distanceMatrix;
  }

  order.debug = debug;

  order.distance = function (x) {
    if (!arguments.length) {
      return distance$1;
    }
    distance$1 = x;
    return order;
  };

  order.linkage = function (x) {
    if (!arguments.length) {
      return linkage;
    }
    linkage = x;
    return order;
  };

  order.limits = function (x, y) {
    if (!arguments.length) {
      return [i, j];
    }
    i = x;
    j = y;
    return order;
  };

  order.except = function (list) {
    let i;
    if (!arguments.length) {
      return except.slice(0);
    }
    for (i = 1; i < list.length; i++) {
      if (list[i - 1] >= list[i]) {
        throw 'Invalid list, indices not sorted';
      }
    }
    except = list.slice(0);
    return order;
  };

  function orderExcept(vector, i, j) {
    const distanceMatrix = dist().distance(distance$1)(vector);
    let k,
      l,
      rev = false,
      args,
      pos = -1;

    // Set a null distance to stick i/i+1 together
    // TODO: check if no other pair is also ==0
    distanceMatrix[i][i + 1] = 0;
    distanceMatrix[i + 1][i] = 0;
    const perm = ordering().distanceMatrix(distanceMatrix)(vector);
    pos = perm.indexOf(i);
    for (k = 0; k < perm.length; k++) {
      l = perm[k];
      if (l > i) {
        perm[k] += j - i - 2;
      }
    }
    if (pos !== 0 && perm[pos - 1] === j - 1) {
      rev = true;
    }
    if (rev) {
      perm.reverse();
      pos = perm.length - pos - 1;
    }
    args = [pos + 1, 0].concat(range(i + 1, j - 1));
    Array.prototype.splice.apply(perm, args);
    return perm;
  }

  order.orderrowsexcept = orderExcept;

  return order;
}

// Takes a matrix, substract the mean of each row
// so that the mean is 0
function center(v) {
  const n = v.length;

  if (n === 0) {
    return null;
  }

  const mean = meancolumns(v);
  const o = mean.length;
  const v1 = Array(n);

  for (let i = 0; i < n; i++) {
    const row = v[i].slice(0);
    for (let j = 0; j < o; j++) {
      row[j] -= mean[j];
    }
    v1[i] = row;
  }
  return v1;
}

// See http://en.wikipedia.org/wiki/Power_iteration
function pca1d(v, eps) {
  if (v.length === 0) {
    return null;
  }

  v = center(v);
  const cov = variancecovariance(v);
  return poweriteration(cov, eps);
}

function pca_order(v, eps) {
  return sort_order(pca1d(v, eps));
}

function array_to_dicts(data, axes = range(data[0].length)) {
  const ret = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const dict = {};
    for (let j = 0; j < row.length; j++) {
      dict[axes[j]] = row[j];
    }
    ret.push(dict);
  }
  return ret;
}

function dicts_to_array(dicts, keys = Object.keys(dicts[0])) {
  const n = keys.length;
  const m = dicts.length;
  const array = Array(m);

  for (let i = 0; i < m; i++) {
    const row = Array(n);
    array[i] = row;
    for (let j = 0; j < n; j++) {
      row[j] = dicts[i][keys[j]];
    }
  }
  return array;
}

function abs_matrix(x) {
  return x.map((y) => y.map(Math.abs));
}

function pcp_flip_axes(perm, pcor) {
  const signs = [1];
  let sign = 1;
  let negs = 0;
  for (let i = 1; i < perm.length; i++) {
    const c = pcor[perm[i - 1]][perm[i]];
    if (c < 0) {
      sign = -sign;
    }
    if (sign < 0) {
      signs.push(-1);
      negs++;
    } else {
      signs.push(1);
    }
  }
  if (exports.debug) {
    console.log(signs);
  }
  if (negs > perm.length / 2) {
    for (let i = 0; i < perm.length; i++) {
      signs[i] = -signs[i];
    }
  }
  return signs;
}

function pcp(tdata, axes) {
  if (!axes) {
    axes = range(tdata.length);
  }

  const pcor = correlation.pearsonMatrix(tdata);
  const abs_pcor = abs_matrix(pcor);
  const perm = optimal_leaf_order().distanceMatrix(abs_pcor)(tdata);
  const naxes = permute(axes, perm);
  const signs = pcp_flip_axes(perm, pcor);
  return [naxes, signs, perm, pcor];
}

function parcoords(p) {
  p.detectDimensions().autoscale();

  const data = p.data();
  const types = p.types();
  const hidden = p.hideAxis();
  const yscale = p.yscale;
  const discarded = [];
  const tdata = [];
  let dimensions = p.dimensions();

  for (let i = 0; i < dimensions.length; i++) {
    const d = dimensions[i];
    if (hidden.includes(d)) {
      // remove dimension
      dimensions.splice(i, 1);
      discarded.push(d);
      i--;
    } else if (types[d] == 'number' || types[d] == 'date') {
      const row = [];
      const scale = yscale[d];
      for (let j = 0; j < data.length; j++) {
        row.push(scale(data[j][d]));
      }
      tdata.push(row);
    } else {
      // remove dimension
      dimensions.splice(i, 1);
      discarded.push(d);
      i--;
    }
  }
  const [naxes, signs] = pcp(tdata, dimensions);

  // put back string and hidden columns
  dimensions = naxes.concat(discarded.reverse());
  p.dimensions(dimensions);
  p.hideAxis(hidden);
  for (let i = 0; i < signs.length; i++) {
    if (signs[i] < 0) {
      p.flip(dimensions[i]);
    }
  }
}

function parcoords_es(p) {
  const dimensions = p.dimensions();
  const data = p.data();
  const ignored = [];
  const axes = [];
  const tdata = [];

  for (const d in dimensions) {
    const val = dimensions[d];
    if (val.type == 'number' || val.type == 'date') {
      const row = [];
      const scale = val.yscale;
      for (let j = 0; j < data.length; j++) {
        row.push(scale(data[j][d]));
      }
      tdata.push(row);
      axes.push(d);
    } else {
      ignored.push(d);
    }
  }
  const [naxes, signs] = pcp(tdata, axes);
  const ndomain = naxes.concat(ignored.reverse());
  // change the order in the xscale
  p.xscale.domain(ndomain);
  p.sortDimensions();
  for (let i = 0; i < signs.length; i++) {
    if (signs[i] < 0) {
      p.flip(ndomain[i]);
    }
  }
}

/*
 * Profile
 * The sum of: for each vertex u: the distance in the ordering to the smallest index vertex v, given the edge (u,v) exists
 *
 * E.g. (column-based calculation, '-' are not used for profile calculation)
 *               PR =
 * [1,-,-,-,-,-] 0 +
 * [1,1,-,-,-,-] 1 +
 * [0,0,1,-,-,-] 0 +
 * [0,1,0,1,-,-] 2 +
 * [1,0,1,0,1,-] 4 +
 * [1,0,0,1,0,1] 5
 *                 = 12
 *
 * WARNING: This is NOT a proper metric for DIRECTED graphs
 *
 * @matrix: a permuted matrix
 */
function profile(matrix) {
  let profile = 0;
  for (let i = 0; i < matrix.length; i++) {
    let min = matrix.length;
    for (let j = 0; j < matrix.length; j++) {
      if (matrix[i][j] > 0) {
        if (j < min) {
          min = j;
        }
      }
    }
    if (min < i) {
      profile += i - min;
    }
  }
  return profile;
}

function spectral_order(graph, comps) {
  let order = [];
  if (!comps) {
    comps = graph.components();
  }

  for (let i = 0; i < comps.length; i++) {
    const comp = comps[i];
    const vec = fiedler_vector(laplacian(graph, comp));
    const perm = sort_order(vec);
    order = order.concat(permute(comp, perm));
  }
  return order;
}

function stablepermute(list, indexes) {
  const p = permute(list, indexes);
  if (p[0] > p[p.length - 1]) {
    p.reverse();
  }
  return p;
}

function sum(v) {
  let i = v.length;
  let s = 0;
  while (i-- > 0) {
    if (!isNaN(v[i])) {
      s += v[i];
    }
  }
  return s;
}

function transposeSlice(a, start = 0, end = a[0].length) {
  const m = a.length;
  const n = end;
  const b = new Array(end - start);

  let i = start - 1;

  while (++i < n) {
    b[i] = new Array(m);
    let j = -1;
    while (++j < m) {
      b[i - start][j] = a[j][i];
    }
  }
  return b;
}

// Computes the union of a list of matrices
function union(matrices) {
  let pile = [];
  for (let i = 0; i < matrices[0].length; i++) {
    if (!pile[i]) {
      pile.push([]);
    }
    for (let j = 0; j < matrices[0][0].length; j++) {
      if (pile[i].length < matrices[0][0].length) {
        pile[i].push(0);
      }
      for (let k = 0; k < matrices.length; k++) {
        pile[i][j] = pile[i][j] + matrices[k][i][j];
      }
    }
  }
  return pile;
}

Object.defineProperty(exports, 'zeroes', {
  enumerable: true,
  get: function () { return science.zeroes; }
});
exports.adjacent_exchange = adjacent_exchange;
exports.all_pairs_distance = all_pairs_distance;
exports.all_pairs_distance_bfs = all_pairs_distance_bfs;
exports.all_pairs_distance_floyd_warshall = all_pairs_distance_floyd_warshall;
exports.array1d = array1d;
exports.array_to_dicts = array_to_dicts;
exports.assert = assert;
exports.bandwidth = bandwidth;
exports.bandwidth_matrix = bandwidth_matrix;
exports.barycenter = barycenter;
exports.barycenter_order = barycenter_order;
exports.bfs = bfs;
exports.bfs_distances = bfs_distances;
exports.bfs_order = bfs_order;
exports.ca = ca;
exports.ca_decorana = ca_decorana;
exports.ca_order = ca_order;
exports.check_distance_matrix = check_distance_matrix;
exports.cmp_number = cmp_number;
exports.cmp_number_asc = cmp_number_asc;
exports.cmp_number_desc = cmp_number_desc;
exports.complete_graph = complete_graph;
exports.condition = condition;
exports.correlation = correlation;
exports.count_all_crossings = count_all_crossings;
exports.count_crossings = count_crossings;
exports.count_in_crossings = count_in_crossings;
exports.count_out_crossings = count_out_crossings;
exports.covariance = covariance;
exports.covariancetranspose = covariancetranspose;
exports.cuthill_mckee = cuthill_mckee;
exports.cuthill_mckee_order = cuthill_mckee_order;
exports.dicts_to_array = dicts_to_array;
exports.displaymat = displaymat;
exports.dist = dist;
exports.dist_remove = dist_remove;
exports.distance = distance;
exports.distmat2valuemat = distmat2valuemat;
exports.distmax = distmax;
exports.distmin = distmin;
exports.dot = dot;
exports.edgesum = edgesum;
exports.fiedler_vector = fiedler_vector;
exports.fix_distance_matrix = fix_distance_matrix;
exports.flatten = flatten;
exports.floyd_warshall_path = floyd_warshall_path;
exports.floyd_warshall_with_path = floyd_warshall_with_path;
exports.graph = graph;
exports.graph2mat = graph2mat;
exports.graph2valuemats = graph2valuemats;
exports.graph_connect = graph_connect;
exports.graph_empty = graph_empty;
exports.graph_empty_nodes = graph_empty_nodes;
exports.graph_random = graph_random;
exports.graph_random_erdos_renyi = graph_random_erdos_renyi;
exports.hcluster = hcluster;
exports.infinities = infinities;
exports.intersect_sorted_ints = intersect_sorted_ints;
exports.inverse_permutation = inverse_permutation;
exports.laplacian = laplacian;
exports.length = length;
exports.linear_arrangement = linear_arrangement;
exports.mat2graph = mat2graph;
exports.mean = mean;
exports.meancolumns = meancolumns;
exports.meantranspose = meantranspose;
exports.morans_i = morans_i;
exports.mult_adjacent_exchange = mult_adjacent_exchange;
exports.mult_barycenter = mult_barycenter;
exports.mult_barycenter_order = mult_barycenter_order;
exports.mult_dist = mult_dist;
exports.nn_2opt = nn_2opt;
exports.normalize = normalize$1;
exports.optimal_leaf_order = optimal_leaf_order;
exports.order = order;
exports.parcoords = parcoords;
exports.parcoords_es = parcoords_es;
exports.pca1d = pca1d;
exports.pca_order = pca_order;
exports.pcp = pcp;
exports.permutation = permutation;
exports.permute = permute;
exports.permute_inplace = permute_inplace;
exports.permute_matrix = permute_matrix;
exports.permutetranspose = permutetranspose;
exports.poweriteration = poweriteration;
exports.poweriteration_n = poweriteration_n;
exports.printhcluster = printhcluster;
exports.printmat = printmat;
exports.printvec = printvec;
exports.profile = profile;
exports.randomPermutation = randomPermutation;
exports.randomPermute = randomPermute;
exports.random_array = random_array;
exports.random_matrix = random_matrix;
exports.range = range;
exports.reverse_cuthill_mckee = reverse_cuthill_mckee;
exports.reverse_cuthill_mckee_order = reverse_cuthill_mckee_order;
exports.set_debug = set_debug;
exports.sort_order = sort_order;
exports.sort_order_ascending = sort_order_ascending;
exports.sort_order_descending = sort_order_descending;
exports.spectral_order = spectral_order;
exports.stablepermute = stablepermute;
exports.sum = sum;
exports.transpose = transpose;
exports.transposeSlice = transposeSlice;
exports.union = union;
exports.valuemats_reorder = valuemats_reorder;
exports.variancecovariance = variancecovariance;
exports.version = version;
