const rulesCache = new Cache({ maxSize: 250, defaultTTL: 3600000 });

const fetchRulesById = async (clusterId) => {
  const cacheKey = `rules_${clusterId}`;
  const cachedRules = rulesCache.get(cacheKey);

  if (cachedRules) {
    console.log("Using cached rules data");
    return cachedRules;
  }

  console.log("Fetching rules from server...");
  const response = await fetch("/rules_from_id", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ cluster_id: clusterId }),
  });

  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  const res = await response.json();
  rulesCache.set(cacheKey, res);
  return res;
};

const handleChangeToClusterView = async (cluster) => {
  const data = await fetchRulesById(cluster);

  const rules = data["rules"];
  const dates = data["dates"];

  var attributes = [...new Set(
    rules.flatMap(item => [...item.antecedent, ...item.consequent])
  )].sort(
    (a, b) => {
      const aSufix = a.split('$')[1];
      const bSufix = b.split('$')[1];
      return aSufix.localeCompare(bSufix);
    }
  )
  
  let attributes1 = attributes.filter(x => x.slice(-1) === 'A').sort();
  let attributes2 = attributes.filter(x => x.slice(-1) === 'C').sort();
  attributes = attributes1.concat(attributes2);

  const rulesIds = rules.map(item => item.id);
  const rulesRepresentations = rules.map(rule => {
    const antecedent = rule.antecedent;
    const consequent = rule.consequent;

    return {
      count: [
        ...antecedent.map(item => [item, 1]),
        ...consequent.map(item => [item, 1]),
      ],
      id: rule.id,
      max: 1,
    }
  })

  const rulesSizes = Object.fromEntries(
    rulesIds.map(id => [id, 1])
  )

  const rulesTimeLine = rules.flatMap(rule => 
    rule.count.map((item, idx) => ({
      count: item,
      date: globalState.dates[idx],
      id: rule.id
    }))
  );
  
  drawIndividualRules(attributes, rulesIds, rulesRepresentations, rulesSizes, rulesTimeLine, globalState.dates);
  // drawMap3();
};