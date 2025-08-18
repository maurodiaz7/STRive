var date_label_1 = '#525252';
var date_label_2 = '#1d4e96';
let selectedRuleId = null;

function drawIndividualRules(all_attributes, cluster_ids,cluster_representations,cluster_sizes,cluster_timeline,dates){
	//reset selection
	selectedDates = [];
	//create initial cluster map
	rules_selected = [];
	attributes_selected = [];
	var clusterMap = {};
	for (let i = 0; i<cluster_representations.length; i++){
		var cid = cluster_representations[i].id;
		var cdata = cluster_representations[i].count;
		clusterMap[cid] = {};
		for (let j = 0; j < cdata.length; j++){
			clusterMap[cid][cdata[j][0]] = cdata[j][1]
		}
	}

	var margin = { top: 5, right: 15, bottom: 5, left: 10 };

	d3.select('#cluster-view-rules').selectAll('svg').remove();
	d3.select('#cluster-view-rules-header').selectAll('svg').remove();
	d3.select('#cluster-heatmap-rules').selectAll('svg').remove();
	d3.select('#cluster-heatmap-rules-header').selectAll('svg').remove();
	var element = document.getElementById('cluster-view-rules');
	var elementRulesHeader = document.getElementById('cluster-view-rules-header');
	var fullHeight = element.clientHeight;
	var fullHeightRulesHeader = elementRulesHeader.clientHeight;
	var fullWidth = element.clientWidth;
	var fullWidthRulesHeader = elementRulesHeader.clientWidth;
	if (margin.top + 30*cluster_ids.length > fullHeight){
		fullHeight = margin.top + 30*cluster_ids.length;
	}

	// Constants to add two separate G in same SVG
	var svg = d3.select('#cluster-view-rules')
		.append('svg')
		.attr('width', fullWidth)
		.attr('height', fullHeight);
	
	var svgClusterHeader = d3.select('#cluster-view-rules-header')
		.append('svg')
		.attr('width', fullWidthRulesHeader)
		.attr('height', fullHeightRulesHeader);

	var height = fullHeight - margin.top - margin.bottom;
	// Constants for G1
	var width1 = fullWidth - margin.left - margin.right;
	width1 = width1;

	const g1 = svg.append('g')
		.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
	const g1_background = svg.append('g')
		.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
	const g1_hselector = svg.append('g')
		.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
	const g1_clusters = svg.append('g')
		.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
	const g1_selector = svg.append('g')
		.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

	const gClusterHeader = svgClusterHeader.append('g')
		.attr('transform', 'translate(' + margin.left + ',' + fullHeightRulesHeader + ')');
	
	/*Apply reorderjs to clusters*/
	var cluster_matrix = [];
	for(let i = 0; i < cluster_ids.length; i++){
		var cluster_row = cluster_timeline.filter(d => d.id == cluster_ids[i]);
		cluster_row = cluster_row.map(d => d.count);
		cluster_matrix.push(cluster_row);
	}
	var perm = reorder.optimal_leaf_order()(cluster_matrix);
	var permIds = [];
	for (let i = 0; i < cluster_ids.length; i++) {
		// permIds.push(rule_labels[perm[i]]);
		permIds.push(cluster_ids[perm[i]]);
	}
	cluster_ids = permIds.slice();

	var xScale = d3.scaleBand()
		.domain(all_attributes)
		.range([0, width1])
		.padding(0);

	var yScale = d3.scaleBand()
		.domain(cluster_ids)
		.range([height, 0])
		.padding(0);

	const axisGroup = gClusterHeader.append('g')
		.attr('transform', 'translate(0,' + 0 + ')')
		.call(d3.axisTop(xScale).tickSize(0));
		
	axisGroup.select(".domain").remove();

	var tooltip = d3.select("#tooltip");

	axisGroup.selectAll("text")
		.style("text-anchor", "start")
		.style("font-size", "10px")
		.attr("fill", 'black')
		.attr("dx", ".05em")
		.attr("dy", ".1em")
		.attr("transform", "rotate(-55)")
		.text(d => d.slice(0, -2))
		.on("mouseover", function (event, d) {
            var x = event.clientX;
            var y = event.clientY;
            x = x - 40;
            y = y - 60;

            tooltip.style("display", "block");
            tooltip.html('<p>' + d.slice(0, -2) + '</p>')
                .style("left", x + "px")
                .style("top", y + "px");
        })
        .on("mouseout", function (d) {
            tooltip.style("display", "none");
        });

	g1_background.selectAll('rect')
		.data(all_attributes)
		.enter()
		.append('rect')
		.attr('x', d => xScale(d))
		.attr('y', 0)
		.attr('width', xScale.bandwidth())
		.attr('height', height)
		.attr('fill', (d, i) => i % 2 == 0 ? 'white' : bg_color)
		.attr('opacity', 1);

	g1_hselector.selectAll('rect')
		.data(all_attributes)
		.enter()
		.append('rect')
		.attr('id', (d,i) => 'hselect_' + i)
		.attr('x', d => xScale(d))
		.attr('y', 0)
		.attr('width', xScale.bandwidth())
		.attr('height', height)
		.attr('fill', hselector_color)
		.attr('opacity', 0);

	var cluster_lines = [];
	var cluster_data = [];
	for (let i = 0; i < cluster_representations.length; i++) {
		var all_x = cluster_representations[i].count.map(d => xScale(d[0]));
		var min = Math.min(...all_x);
		var max = Math.max(...all_x);
		cluster_lines.push({ 'id': cluster_representations[i].id, 'start': min, 'end': max });
		const curr_cluster = cluster_representations[i].count.map(([attr, value]) => ({
			id: cluster_representations[i].id, attr, value,
			type: attr[attr.length - 1]
		}));
		cluster_data.push(curr_cluster);
	}
	cluster_data = cluster_data.flat();
	g1_clusters.selectAll("line")
		.data(cluster_lines)
		.enter()
		.append("line")
		.attr("x1", d => d.start + xScale.bandwidth() / 2)
		.attr("x2", d => d.end + xScale.bandwidth() / 2)
		.attr("y1", d => yScale(d.id) + yScale.bandwidth() / 2)
		.attr("y2", d => yScale(d.id) + yScale.bandwidth() / 2)
		.attr("stroke", rect_stroke)
		.attr("stroke-width", 2);

	var min_r = Math.min(...[xScale.bandwidth() / 2, yScale.bandwidth() / 2]);

	g1_clusters.selectAll('circle')
		.data(cluster_data)
		.enter()
		.append('circle')
		.attr('cx', d => xScale(d.attr) + (xScale.bandwidth()) / 2)
		.attr('cy', d => yScale(d.id) + (yScale.bandwidth()) / 2)
		.attr('r', d => (min_r/4 + (d.value / cluster_sizes[d.id]) * (min_r - min_r/4))/2)
		.attr('stroke', rect_stroke)
		.attr('fill', d => (d.type == 'A' ? color_a : color_c))
		.attr('opacity', 1);
	
	g1_selector.selectAll('rect')
		.data(cluster_ids)
		.enter()
		.append('rect')
		.attr('id', d => 'rule_box_' + d)
		.attr('class', 'rule_cluster_box')
		.attr('x', 0)
		.attr('y', d => yScale(d))
		.attr('width', width1)
		.attr('height', yScale.bandwidth())
		.attr('fill', 'red')
		.attr('fill-opacity', 0)
		.attr('stroke', rect_stroke)
		.attr('stroke-opacity', 1)
		.attr('rx', 2)
		.attr('cursor', 'pointer')
		.on('click', function (event, d) {
			selectedRuleId = d;
			d3.selectAll('.rule_cluster_box').attr('fill-opacity', 0);
			d3.select(this).attr('fill-opacity', 0.15);
			getRuleData(d);
		});
	
	// Cluster heatmap
	var element = document.getElementById('cluster-heatmap-rules');
	var elementHeatmapHeader = document.getElementById('cluster-heatmap-rules-header');
	var fullHeight = element.clientHeight;
	var fullWidth = element.clientWidth;
	if (margin.top + 30*cluster_ids.length > fullHeight){
		fullHeight = margin.top + 30*cluster_ids.length;
	}
	var fullHeightHeatmapHeader = elementHeatmapHeader.clientHeight;
	var fullWidthHeatmapHeader = elementHeatmapHeader.clientWidth;

	// Constants to add two separate G in same SVG
	var svg = d3.select('#cluster-heatmap-rules')
		.append('svg')
		.attr('width', fullWidth)
		.attr('height', fullHeight);
	
	var svgHeatmapHeader = d3.select('#cluster-heatmap-rules-header')
		.append('svg')
		.attr('width', fullWidthHeatmapHeader)
		.attr('height', fullHeightHeatmapHeader);

	var colorBarWidth = margin.right*4;
	var width2 = fullWidth - margin.left - colorBarWidth;
	var colorBarHeight = element.clientHeight - margin.top;

	const g2 = svg.append('g')
		.attr('transform', 'translate(' + (margin.left)  + ',' + margin.top + ')');
	const g2_clusters = svg.append('g')
		.attr('transform', 'translate(' + (margin.left) + ',' + margin.top + ')');
	const g2_hbars = svg.append('g')
		.attr('transform', 'translate(' + (margin.left) + ',' + margin.top + ')');
	
	const gHeatmapHeader = svgHeatmapHeader.append('g')
		.attr('transform', 'translate(' + (margin.left)  + ',' + fullHeightHeatmapHeader + ')');

	var xScale2 = d3.scaleBand()
		.domain(dates)
		.range([0, width2])
		.padding(0);

	// Add X axis
	gHeatmapHeader.append('g')
		.attr('transform', 'translate(0,' + 0 + ')')
		.call(d3.axisTop(xScale2).tickSize(0))
		.selectAll("text")
		.style("text-anchor", "start")
		.style("font-size", "11px")
		.attr("dx", ".2em")
		.attr("dy", ".2em")
		.attr("color", d=>{
			const year = d.slice(0, 4);
			if (year % 2 == 0){
				return date_label_1;
			}
			else{
				return date_label_2;
			}
		})
		.attr('cursor', 'pointer')
		.attr("transform", "rotate(-55)")
		.on('click', function (event, d) {
			var current = d3.select(this);
			if (!current.classed("date_clicked")) {
				current.classed('date_clicked', true);
				current.attr("color", 'red');

				selectedDatesRules.push(d);
				d3.select('#datebar_rule_' + d)
					.attr('stroke-opacity', 1);
			}
			else {
				current.classed('date_clicked', false);
				current.attr("color", d=>{
					const year = d.slice(0, 4);
					if (year % 2 == 0){
						return date_label_1;
					}
					else{
						return date_label_2;
					}
				});

				const index = selectedDatesRules.indexOf(d);
				selectedDatesRules.splice(index, 1); 
				d3.select('#datebar_rule_' + d)
					.attr('stroke-opacity', 0);
			}
			drawMap3();
		})
		.text(d=>{
			const month = d.slice(-2);
			const year = d.slice(0, 4);
			const date = new Date(2000, parseInt(month, 10) - 1);
			if (month == '01'){
				return new Intl.DateTimeFormat('en', { month: 'short' }).format(date) + ' ' + year;
			}
			else{
				return new Intl.DateTimeFormat('en', { month: 'short' }).format(date);
			}
		});

	var all_x = cluster_timeline.map(d => d.count);
	var min = Math.min(...all_x);
	var max = Math.max(...all_x);

	var occurrenceScale = d3.scaleLinear()
		.domain([min, max])
		.range([0, 1]);

	g2_clusters.selectAll("rect")
		.data(cluster_timeline)
		.enter()
		.append("rect")
		.attr('class', 'timeline-box')
		.attr('id', d => 'clusterbar_' + d.id + '_date_' + d.date)
		.attr("x", d => xScale2(d.date))
		.attr("y", d => yScale(d.id))
		.attr("width", xScale2.bandwidth())
		.attr("height", d => yScale.bandwidth())
		.attr("fill", d => d3.interpolateMagma(occurrenceScale(d.count)));

	g2_hbars.selectAll("rect")
		.data(dates)
		.enter()
		.append("rect")
		.attr('id', d => 'datebar_rule_' + d)
		.attr("x", d => xScale2(d))
		.attr("y", 0)
		.attr("width", xScale2.bandwidth())
		.attr("height", height)
		.attr("fill", 'transparent')
		.attr("stroke", "red")
		.attr("stroke-opacity", 0)

	var grad = svg.append('defs')
		.append('linearGradient')
		.attr('id', 'grad-rules')
		.attr('x1', '0%')
		.attr('x2', '0%')
		.attr('y1', '100%')
		.attr('y2', '0%');
		
	d3.range(0, 1.01, 0.01).forEach(t => {
		grad.append("stop")
		.attr("offset", `${t * 100}%`)
		.attr("stop-color", d3.interpolateMagma(t));
	});
	// color legend
	g2.append('rect')
		.attr('x', width2 + 10)
		.attr('y', colorBarHeight/2 - colorBarHeight/4) 
		.attr('width', colorBarWidth/3)
		.attr('height', colorBarHeight/2)
		.attr('stroke','black')
		.style('fill', 'url(#grad-rules)');

	g2.append('text')
		.attr('x', width2 + 25 + (colorBarWidth/3)/4)
		.attr('y', colorBarHeight/2 - colorBarHeight/4 - 5)
		.style('text-anchor', 'middle')
		.style('font-size','10px')
		.style('font-weight', 'bold')
		.attr('opacity',1)
		.text('Occurrences');

	g2.append('text')
		.attr('x', width2 + 40 + (colorBarWidth/3)/4)
		.attr('y', colorBarHeight/2 - colorBarHeight/4 + 10)
		.style('text-anchor', 'middle')
		.style('font-size','12px')
		.style('font-weight', 'bold')
		.attr('opacity',1)
		.text(max);

	g2.append('text')
		.attr('x', width2 + 40 + (colorBarWidth/3)/4)
		.attr('y', colorBarHeight/2 + colorBarHeight/4)
		.style('text-anchor', 'middle')
		.style('font-size','12px')
		.style('font-weight', 'bold')
		.attr('opacity',1)
		.text(min);
}