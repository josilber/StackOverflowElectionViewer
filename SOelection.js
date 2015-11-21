var getKey = function(d) {
    return d.Id;
}

var legendKey = function(d) {
    return d.count;
}

// randX and randY return a random x and y location on the boundary of the
// graph. i%4 == 0 maps to bottom, i%4 == 1 maps to left, i%4 == 2 maps to top,
// and i%4 == 3 maps to right. Random position is selected on that edge.
var randX = function(d, i) {
    if (i % 4 == 1) {
	return graph.xpix[0];
    } else if (i % 4 == 3) {
	return graph.xpix[1];
    } else {
	return graph.xpix[0] + Math.random() * (graph.xpix[1] - graph.xpix[0]);
    }
}

var randY = function(d, i) {
    if (i % 4 == 0) {
	return graph.ypix[0];
    } else if (i % 4 == 2) {
	return graph.ypix[1];
    } else {
	return graph.ypix[0] + Math.random() * (graph.ypix[1] - graph.ypix[0]);
    }
}

var hoverCandidate = function(id) {
  document.getElementById("candText" + id).style.fontWeight="bold";
  
  d3.selectAll("circle.point")
    .style("stroke-width", function(d) {
      if (d.Id == id) {
        return 3;
      } else {
        return 1;
      }
    });
}

var unhoverCandidate = function(id) {
  document.getElementById("candText" + id).style.fontWeight="normal";

  d3.selectAll("circle.point")
    .style("stroke-width", 1);
}

var showAll = function() {
  if (data == null) {
    return;
  }

  for (var i=0; i < data.length; ++i) {
    document.getElementById("check" + data[i].Id).checked = true;
  }
  d3Update("checkbox");
}

var getLegendPoints = function(pdat) {
    // Determine nice values for the three points
    var minR = d3.min(pdat, function(d) {  return d.r; })
    var maxR = d3.max(pdat, function(d) {  return d.r; })
    var val1 = 3;
    var val2 = 2;
    var val3 = 1;
    if (minR > 0.1 * maxR) {
	val1 = maxR;
	val2 = Math.round((minR + maxR) / 2.0);
	val3 = minR;
    } else {
	var val1s = [3, 4, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000,
		     10000, 25000, 50000, 100000, 250000, 500000];
	var val2s = [2, 2, 2, 5, 10, 25, 10, 100, 50, 100, 250, 500,
		     1000, 2500, 5000, 10000, 25000, 50000];
	var val3s = [1, 1, 1, 1, 5, 10, 1, 25, 5, 10, 25, 50,
		     100, 250, 500, 1000, 2500, 5000];
	for (var i=0; i < val1s.length; ++i) {
	    if (maxR >= val1s[i]) {
		val1 = val1s[i];
		val2 = val2s[i];
		val3 = val3s[i];
	    }
	}
    }
    var points = [val3, val2, val1];

    // Generate a data structure describing the selected points
    var legend = []
    for (var i=0; i < points.length; ++i) {
	legend.push({count: i,
		     r: graph.rScale(points[i]),
		     val: points[i]});
    }
    return legend;
}

var getTooltip = function(d) {
    return d.DisplayName + " (x: " + d.x + ", y: " + d.y + ", r: " + d.r + ")";
}

var dataColumn = function(col) {
    return col != "DisplayName" && col != "Id" && col != "Moderator" &&
	col != "InRunning";
}

var parseURL = function() {
    // URL parsing from http://stackoverflow.com/a/979995/3093387
    var query_string = {};
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i=0;i<vars.length;i++) {
        var pair = vars[i].split("=");
        // If first entry with this name
        if (typeof query_string[pair[0]] === "undefined") {
            query_string[pair[0]] = decodeURIComponent(pair[1]);
            // If second entry with this name
        } else if (typeof query_string[pair[0]] === "string") {
            var arr = [ query_string[pair[0]],decodeURIComponent(pair[1]) ];
            query_string[pair[0]] = arr;
            // If third or later entry with this name
        } else {
            query_string[pair[0]].push(decodeURIComponent(pair[1]));
        }
    }
    return query_string;
}



var getUserColumn = function(moderator) {
    var newHTML = "";
    for (var i = 0; i < data.length; ++i) {
        // Lord I hope nobody reads the source code and sees this monstrosity
	if (data[i].Moderator == moderator) {
	    var checked = "";
	    if (data[i].Moderator == 1 || data[i].InRunning != 0) {
		checked = " checked";
	    }
            newHTML += "<span id='candText" + data[i].Id + "' onmouseover='hoverCandidate(" + data[i].Id + ")' onmouseout='unhoverCandidate(" + data[i].Id + ")'><input type='checkbox' id='check" + data[i].Id + "' onmouseover='hoverCandidate(" + data[i].Id + ")' onmouseout='unhoverCandidate(" + data[i].Id + ")' onclick='d3Update(\"checkbox\");'" + checked + "/>&nbsp;&nbsp;<a href='http://stackoverflow.com/u/" + data[i].Id + "'>" + data[i].DisplayName + "</a>&nbsp;&nbsp;<div class='ccircle' style='background-color: " + graph.colorScale(data[i].Id) + ";'></div></span><br/>";
	}
    }
    return newHTML;
}

var getDomain = function(variable, pdat, domainScalar) {
    var vmin = d3.min(pdat, function(d) {  return d[variable]; });
    var vmax = d3.max(pdat, function(d) {  return d[variable]; });
    if (vmin <= 0.1 * vmax) {
	return [0, vmax * domainScalar];
    } else {
	return [vmin / domainScalar, vmax * domainScalar];
    }
}

var d3Update = function(type) {
    // Don't do anything if the data hasn't been loaded.
    if (data == null) {
	return;
    }

    // Setup the candidate list in the HTML if this is the first load, and
    // further load up selections from the URL (if they are provided).
    if (type == "first") {
	// Create the color scale for points
	var allId = [];
	for (var i=0; i < data.length; ++i) {
	  if (data[i].Moderator == 0) {
	    allId.push(data[i].Id);
	  }
	}
	graph.baseColorScale = d3.scale.category20()
	    .domain(allId);
	graph.colorScale = function(id) {
	  for (var i=0; i < data.length; ++i) {
	    if (data[i].Id == id) {
              if (data[i].Moderator == 0) {
		 return graph.baseColorScale(id);
	       } else {
	         return "white";
	       }
	    }
	  }
	  return "white";  // Shouldn't ever reach here
	}


	// Candidate list can now be created:
	var newHTML = "<table><tr><td><b>Candidates</b><br/>" +
	    getUserColumn(0) + "</td><td><b>Moderators</b><br/>" +
	    getUserColumn(1) + "</td></tr></table>";
	document.getElementById("candidates").innerHTML = newHTML;

      // Time for the selections from the URL
      var query_string = parseURL();
      var processedURL = false;
      if (query_string.hasOwnProperty("x") &&
	  query_string.hasOwnProperty("y") &&
	  query_string.hasOwnProperty("r") &&
	  query_string.hasOwnProperty("c")) {
        var xvar = query_string.x;
	var yvar = query_string.y;
        var rvar = query_string.r;
	var cvals = query_string.c.split("_");
	if (data[0].hasOwnProperty(xvar) && data[0].hasOwnProperty(yvar) &&
	    data[0].hasOwnProperty(rvar) && dataColumn(xvar) &&
	    dataColumn(yvar) && dataColumn(rvar)) {
	  // Variables are valid, so we will load this one up
          processedURL = true;
	  document.getElementById("xselect").value = xvar;
	  document.getElementById("yselect").value = yvar;
	  document.getElementById("rselect").value = rvar;
	  for (var i=0; i < data.length; ++i) {
	    var matched = false;
	    for (var j=0; j < cvals.length; ++j) {
              if (data[i].Id == cvals[j]) {
		matched = true;
		break;
	      }
	    }
	    document.getElementById("check" + data[i].Id).checked = matched;
	  }
	}
      }

      // If we did not process the URL, randomly select the three variables
      if (!processedURL) {
        allVars = [];
	for (key in data[0]) {
	  if (data[0].hasOwnProperty(key) && dataColumn(key)) {
	    allVars.push(key);
	  }
	}
	var randX = "";
	var randY = "";
	var randR = "";
	while (randX == randY || randX == randR || randY == randR) {
	  randX = allVars[Math.floor(Math.random() * allVars.length)]
	  randY = allVars[Math.floor(Math.random() * allVars.length)]
	  randR = allVars[Math.floor(Math.random() * allVars.length)]
	}
	document.getElementById("xselect").value = randX;
	document.getElementById("yselect").value = randY;
	document.getElementById("rselect").value = randR;
      }
    }

    // Setup a variables for easy access

    var svgBBox = document.getElementById('graphsvg').getBoundingClientRect();
    var w = svgBBox.right - svgBBox.left;
    var h = svgBBox.bottom - svgBBox.top;
    var leftPadding = 100;
    var rightPadding = 30;
    var topPadding = 30;
    var bottomPadding = 160;
    var transition = 1000;  // ms of transition time
    var svg = d3.select("svg")


    // Looking at the x- and y-axis <select>s as well as the options for the
    // graph, determine the correct data to plot. Store the x value in the
    // variable x and the y value in the variable y.
    var xselect = document.getElementById("xselect");
    var xvar = xselect.value;
    var yselect = document.getElementById("yselect");
    var yvar = yselect.value;
    var rselect = document.getElementById("rselect");
    var rvar = rselect.value;

    // Update the permalink with the current selections
    var candidates = [];
    for (var i=0; i < data.length; ++i) {
	if (document.getElementById("check" + data[i].Id).checked) {
	    candidates.push(data[i].Id);
	}
    }
    var newLink = "SOelection.html?x=" + xvar + "&y=" + yvar + "&r=" + rvar +
	"&c=" + candidates.join("_");
    var query_string = parseURL();
    if (query_string.hasOwnProperty("u")) {
	newLink += "&u=" + query_string.u;
    }
    document.getElementById("permalink").setAttribute("href", newLink);

    var pdat = [];
    for (var i = 0; i < data.length; ++i) {
      if (document.getElementById("check" + data[i].Id).checked) {
	toAdd = {};
	for (var key in data[i]) {
	  if (key != "DisplayName") {
	    toAdd[key] = parseInt(data[i][key])
	  } else {
            toAdd[key] = data[i][key];
	  }
	}
	toAdd.x = toAdd[xvar];
	toAdd.y = toAdd[yvar];
	toAdd.r = toAdd[rvar];
	pdat.push(toAdd);
      }
    }

    // Either setup or update axes, scales, and legend.
    var domainScalar = 1.05;  // Use slightly more than the max value
    if (type == "first") {
	// Create x, y, and radius scales
	graph.xpix = [leftPadding, w - rightPadding];
	graph.xScale = d3.scale.linear()
	    .domain(getDomain("x", pdat, domainScalar))
	    .range(graph.xpix);
	graph.ypix = [h - bottomPadding, topPadding];
	graph.yScale = d3.scale.linear()
	    .domain(getDomain("y", pdat, domainScalar))
	    .range(graph.ypix);

	var rScaleBounds = [1*w/450, 8*w/450];
	graph.rScale = d3.scale.sqrt()
	    .domain(getDomain("r", pdat, 1.0))
	    .range(rScaleBounds)  // Radius linear with graph size

	// Create x and y axes
	graph.xAxis = d3.svg.axis()
	    .scale(graph.xScale)
	    .orient("bottom")
	    .ticks(6);
	graph.yAxis = d3.svg.axis()
	    .scale(graph.yScale)
	    .orient("left")
	    .ticks(8);

	// Add x and y axes to svg
	svg.append("g")
	    .attr("class", "x axis")
	    .attr("transform", "translate(0," + (h - bottomPadding) + ")")
	    .call(graph.xAxis);
	svg.append("g")
	    .attr("class", "y axis")
	    .attr("transform", "translate(" + leftPadding + ",0)")
	    .call(graph.yAxis);

	// Figure out the height of the x axis and width of the y axis
	var xaxisHeight = document.getElementsByClassName("x axis")[0].getBBox().height;
	var yaxisWidth = document.getElementsByClassName("y axis")[0].getBBox().width;

	// Add x axis label, in wrong spot
	var xaxistext = svg.append("text")
	    .attr("class", "x axistext")
	    .text(xselect.options[xselect.selectedIndex].text)
	    .attr("x", leftPadding + (w - leftPadding - rightPadding) / 2)
	    .attr("y", h - bottomPadding);

	// Measure the height of the x axis label
	var xLabHeight = document.getElementsByClassName("x axistext")[0].getBBox().height;

	// Move the x axis label to the correct position
	xaxistext.attr("y", h - bottomPadding + xaxisHeight + xLabHeight);

	// Setup the y axis label
	var xloc = leftPadding - yaxisWidth - (xLabHeight/2 + 20);
	var yloc = topPadding + (h - topPadding - bottomPadding)/2;
	var yaxistext = svg.append("text")
	    .attr("class", "y axistext")
	    .text(yselect.options[yselect.selectedIndex].text)
	    .attr("x", xloc)
	    .attr("y", yloc)
	    .attr("transform", "rotate(270 " + xloc + "," + yloc + ")");

	// Separator above legend
	svg.append("line")
	    .attr("x1", 0)
	    .attr("y1", h - bottomPadding + xaxisHeight + xLabHeight + 20)
	    .attr("x2", w)
	    .attr("y2", h - bottomPadding + xaxisHeight + xLabHeight + 20)
	    .attr("stroke", "gray")
	    .attr("stroke-width", 1)

	// Legend Title
	var legendTitle = svg.append("text")
	    .attr("class", "r axistext")
	    .text("Circle Size: " + rselect.options[rselect.selectedIndex].text)
	    .attr("x", leftPadding + (w - leftPadding - rightPadding) / 2)
	    .attr("y", h - bottomPadding + xaxisHeight + xLabHeight + 50);

	// Determine nicely spaced points for the legend based on scale
	var legend = getLegendPoints(pdat);

	svg.selectAll("text.legendtext")
	    .data(legend, legendKey)
	    .enter()
	    .append("text")
	    .attr("class", "legendtext")
	    .text(function(d) {  return d.val;  })
	    .attr("x", function(d) {
		return leftPadding + (w - leftPadding - rightPadding) * d.count / legend.length + (1.4 * rScaleBounds[1]);
	    })
	    .attr("y", h - bottomPadding + xaxisHeight + xLabHeight + 80)

	var legendText = document.getElementsByClassName("legendtext")
	var maxHeight = 0
	for (var i=0; i < legendText.length; ++i) {
	    maxHeight = Math.max(maxHeight, legendText[i].getBBox().height);
	}

	svg.selectAll("circle.legendcircle")
	    .data(legend, legendKey)
	    .enter()
	    .append("circle")
	    .attr("class", "legendcircle")
	    .attr("r", function(d) {  return d.r;  })
	    .attr("fill", "gray")
	    .attr("cx", function(d) {
		return leftPadding + (w - leftPadding - rightPadding) * d.count / legend.length;
	    })
	    .attr("cy", h - bottomPadding + xaxisHeight + xLabHeight + 80 - (maxHeight/3));
    } else {
	// If we change a variable being plotted or remove/add points, we may
	// need to change the scales. We do so here.

	// Update the scales
	graph.xScale.domain(getDomain("x", pdat, domainScalar))
	graph.yScale.domain(getDomain("y", pdat, domainScalar))
	graph.rScale.domain(getDomain("r", pdat, 1.0))

	// Transition in the new axes
	svg.selectAll(".x.axistext")
	    .text(xselect.options[xselect.selectedIndex].text);
	svg.select(".x.axis")
	    .transition()
	    .duration(transition)
	    .call(graph.xAxis);
	svg.selectAll(".y.axistext")
	    .text(yselect.options[yselect.selectedIndex].text);
	svg.select(".y.axis")
	    .transition()
	    .duration(transition)
	    .call(graph.yAxis);

	// Transition in the new legend information
	var legend = getLegendPoints(pdat);
	svg.selectAll(".r.axistext")
	    .text("Circle Size: " + rselect.options[rselect.selectedIndex].text);
	svg.selectAll("text.legendtext")
	    .data(legend, legendKey)
	    .text(function(d) {  return d.val;  });
	svg.selectAll("circle.legendcircle")
	    .data(legend, legendKey)
	    .attr("r", function(d) {  return d.r;  })
    }

    // Load up new data
    dat = svg.selectAll("circle.point")
	.data(pdat, getKey)

    // Add new where appropriate
    var entering = dat.enter()
	.append("circle")
	.attr("class", "point")
	.attr("r", function(d) {  return graph.rScale(d.r);  })
	.attr("fill", function(d) {  return graph.colorScale(d.Id);  })
	.on("click", function(d) {
	    window.location = "http://stackoverflow.com/u/" + d.Id;
	})
	.on("mouseover", function(d) { hoverCandidate(d.Id); })
        .on("mouseout", function(d) { unhoverCandidate(d.Id); });
  
    // Add tooltips to new points
    entering.append("title")
	.text(getTooltip)

    if (type == "first") {
	// Let's be boring and add the points at their initial positions
	entering.attr("cx", function(d) {  return graph.xScale(d.x);  })
	    .attr("cy", function(d) {  return graph.yScale(d.y);  });
    } else if (type == "x") {
	// If changing x-axis, start with x=0 and then move to correct position.
	entering.attr("cx", graph.xScale(0))
	    .attr("cy", function(d) {  return graph.yScale(d.y);  })
	    .transition()
	    .duration(transition)
	    .attr("cx", function(d) {  return graph.xScale(d.x);  });
	
	var xselect = document.getElementById("xselect");
    } else if (type == "y") {
	// If changing y-axis, start with y=0 and then move to correct position.
	entering.attr("cx", function(d) {  return graph.xScale(d.x);  })
	    .attr("cy", graph.yScale(0))
	    .transition()
	    .duration(transition)
	    .attr("cy", function(d) {  return graph.yScale(d.y);  });

	var yselect = document.getElementById("yselect");
	svg.selectAll(".y.axistext")
	    .text(yselect.options[yselect.selectedIndex].text);
    } else {
	// If switching in all new points, start from random locations and transition.
	entering.attr("cx", randX)
	    .attr("cy", randY)
	    .transition()
	    .duration(transition)
	    .attr("cx", function(d) {  return graph.xScale(d.x);  })
	    .attr("cy", function(d) {  return graph.yScale(d.y);  })
    }

    // Update existing circles
    dat.transition()
	.duration(transition)
	.attr("cx", function(d) {  return graph.xScale(d.x);  })
	.attr("cy", function(d) {  return graph.yScale(d.y);  })
	.attr("r", function(d) {  return graph.rScale(d.r);  })
	.style("opacity", 1);

    // Handle exiting circles (fade them out)
    var exiting = dat.exit()
	.transition()
	.duration(transition)
        .style("opacity", 0)
        .remove();

    // Update tooltips
    dat.selectAll("title")
	.data(pdat, getKey)
	.text(getTooltip);
}

// Returns the width and height of the browser window.
// From: http://www.javascripter.net/faq/browserw.htm
var getWindowDim = function() {
    var winW = 630, winH = 460;
    if (document.body && document.body.offsetWidth) {
	winW = document.body.offsetWidth;
	winH = document.body.offsetHeight;
    }
    if (document.compatMode=='CSS1Compat' &&
	document.documentElement &&
	document.documentElement.offsetWidth ) {
	winW = document.documentElement.offsetWidth;
	winH = document.documentElement.offsetHeight;
    }
    if (window.innerWidth && window.innerHeight) {
	winW = window.innerWidth;
	winH = window.innerHeight;
    }
    return {width: winW,
	    height: winH};
}

var requestPrimaryData = function(first) {
    if (data == null) {
	return;  // Don't request before we have data loaded
    }

    d3.json("primary.txt", function(error, json) {
	if (error == null) {
	    for (var i=0; i < data.length; ++i) {
		if (data[i].Moderator == 0 && data[i].InRunning == 1 &&
		    !json.hasOwnProperty(data[i].Id)) {
		    return;  // Missing data for a candidate
		}
	    }
	    
	    for (var i=0; i < data.length; ++i) {
		if (data[i].Moderator == 0) {
		    data[i].primary = json[data[i].Id];
		}
	    }

	    if (first) {
		d3Update("first");
	    } else {
		d3Update("primary");
	    }
	}
    })
}

var d3Setup = function() {
    // graphDivWidth is the maximum width we can get for the graph without
    // horizontally scrolling. From this, we will compute the actual graph
    // dimensions.

    // Size of graph upper bounded by:
    //   - The maximum width on the screen (minus some small buffer)
    //   - The height of the browser window (minus some substantial buffer)
    //   - Some reasonable maximum width

    var xbuffer = 20;  // horizontal buffer
    var svgBBox = document.getElementById('graphsvg').getBoundingClientRect();
    var widthLimit = (svgBBox.right-svgBBox.left) - xbuffer;
    var windowDim = getWindowDim();
    var ybuffer = 100;  // vertical buffer
    var heightLimit = windowDim.height - ybuffer;

    var reasonableSizeLimit = 750;
    var graphEdge = Math.min(widthLimit, heightLimit, reasonableSizeLimit);

    // Size of graph lower bounded by reasonable lower bound
    var reasonableSizeMin = 250;
    var graphEdge = Math.max(graphEdge, reasonableSizeMin);

    // Setup the actual graph svg
    d3.select("svg")
	.style("width", graphEdge+"px")
	.style("height", graphEdge+"px");

    // Adjust the width of the td containing the graph to get our layout correct
    d3.select("#graphtd")
	.style("width", (graphEdge+10)+"px");

    // Load up the dataset
    d3.csv("candidates5.csv", function(error, d) {
	if (error) {
	    alert("Error loading csv data");
	} else {
	    data = d;

	    // Augment with the user in the URL, if one is provided
	    var urlInfo = parseURL();
	    if (urlInfo.hasOwnProperty("u")) {
		var user = JSON.parse(urlInfo["u"]);
		user.Moderator = "0";
		user.InRunning = "2";
		var allThere = true;
		for (var k in data[0]) {
		    if (!user.hasOwnProperty(k)) {
			allThere = false;
		    }
		}
		if (!allThere) {
		    alert("Missing an expected field for the specified user; please re-run the SEDE queries and refresh the URL");
		} else {
		    data.push(user);
		}
	    }

	    // No primary scores loaded yet
	    for (var i=0; i < data.length; ++i) {
		data[i].primary = 0;
	    }

	    // Load up the primary data and set it to refresh periodically
	    requestPrimaryData(true);
	    setInterval(function() { requestPrimaryData(false) }, 60000);
	}
    });
}

// Oh noes globally scoped JS variables
var data = null;
var graph = {xAxis:null,
	     yAxis:null,
	     xpix:null,
	     ypix:null,
	     rScale:null,
	     xScale:null,
	     yScale:null,
             colorScale:null}
window.onload = d3Setup;

