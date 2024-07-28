import cytoscape from "cytoscape";
import { select, selectAll } from "d3-selection";
import cytoscapeCola from "cytoscape-cola";
import cytoscapeQtip from "cytoscape-qtip";
import { people } from "./people";
import { recommendations } from "./recommendations-v2";

cytoscape.use(cytoscapeCola);
cytoscape.use(cytoscapeQtip);

// NODES for graph
const nodes = people.map((person) => ({
  data: {
    id: person.person.name,
    label: person.person.name,
    photo: person.person.photo,
  },
}));

// EDGES for graph
const edges = recommendations.matches.map((match, index) => ({
  data: {
    id: `edge${index}`,
    source: match.person1,
    target: match.person2,
    ranking: match.ranking,
    reason: match.reason,
    potential: match.potential,
  },
}));

document.addEventListener("DOMContentLoaded", () => {
  const cyContainer = document.getElementById("cy");
  if (!cyContainer) {
    console.error("Element with ID 'cy' not found.");
    return;
  }
});

const cy = cytoscape({
  container: document.getElementById("cy"),
  elements: {
    nodes: nodes,
    // edges: edges,
    edges: [],
  },
  style: [
    {
      selector: "node",
      style: {
        "background-image": "data(photo)",
        label: "data(label)",
        "background-fit": "cover",
        "text-valign": "bottom",
        "text-halign": "center",
        width: 30,
        height: 30,
        "font-size": "7px",
        "font-family": "'Montserrat', sans-serif",
      },
    },
    {
      selector: "edge",
      style: {
        // label: "data(potential)",
        "line-color": "#ccc",
        "curve-style": "bezier",
        "font-size": "2px",
        "text-wrap": "wrap",
        "text-margin-y": -10,
        "text-max-width": 40,
        width: 1,
      },
    },
  ],
  layout: {
    // name: "circle",
    name: "cola",
    animate: true,
    padding: 120,
  },
});

// Create the SVG container inside the Cytoscape container
const svg = select(".overlay");

// Default to "members" view
let currentView = "members";

// this is just to programmtically mouseout on node click event
let currentHoveredEdge = null;
let currentHoveredSourceNode = null;
let currentHoveredTargetNode = null;

// fag for edge view
let isEdgeView = false;

// ================== on NODE click event ==================
cy.on("tap", "node", async function (event) {
  // pass the node clicked
  const node = event.target;

  // get people data from node.data().id
  const personData = people.find((p) => p.person.name === node.data().id);
  const values = personData.values;
  const vision = personData.vision;
  const vehicles = personData.vehicles;

  // Hide all other nodes, edges, and labels
  cy.elements().not(node).style({
    display: "none",
  });

  // hide node label
  node.style({
    "text-opacity": 0,
  });

  // Hide the other buttons
  document.getElementById("members").style.opacity = "0";
  document.getElementById("ai").style.opacity = "0";

  // Show the zoom-out button
  document.getElementById("zoom-out").style.opacity = "1";

  // remove any circles and text
  svg.selectAll("circle").remove();
  svg.selectAll("foreignObject").remove();

  // create circles around the node
  const nodePosition = node.renderedPosition();
  const nodeSize = node.renderedOuterWidth();
  const radius_1 = nodeSize * 1.5;
  const radius_2 = nodeSize * 2.5;
  const radius_3 = nodeSize * 3.5;

  const data = [
    { onion: "person", children: [] },
    { onion: "values", children: values },
    { onion: "vision", children: vision },
    {
      onion: "vehicles",
      children: vehicles.map((v) => (typeof v === "string" ? v : v.org)),
    },
  ];

  const layerWidths = [radius_3, radius_2, radius_1, nodeSize / 2]; // Define your layer widths here
  const len = layerWidths.length;

  const layers = svg.selectAll(".onion").data(data.reverse()).enter();

  const circles = layers
    .append("circle")
    .attr("class", "onion")
    .attr("fill", "none")
    .attr("cx", nodePosition.x)
    .attr("cy", nodePosition.y)
    .attr("r", 0) // Start with a radius of 0 for animation
    .attr("stroke", "grey")
    .attr("stroke-opacity", 0.3);

  const pointsOfPassion = layers
    .selectAll(".passion")
    .data((d, i) =>
      d.children.map((e) => ({ item: e, i, len: d.children.length }))
    );

  const passionGroup = pointsOfPassion
    .enter()
    .append("g")
    .attr("transform", `translate(${nodePosition.x}, ${nodePosition.y})`);

  passionGroup
    .append("circle")
    .attr("class", "person")
    .attr("fill", "none")
    .attr("r", nodeSize / 4);

  const textElements = passionGroup
    .append("foreignObject")
    .attr("class", "passion-name")
    .attr("width", 100) // Adjust width as needed
    .attr("height", 200) // Adjust height as needed
    .attr("x", -50) // Center the foreignObject horizontally
    .attr("y", -10) // Center the foreignObject vertically
    .append("xhtml:div")
    .style("display", "flex")
    .style("justify-content", "center")
    .style("align-items", "center")
    .style("color", "black")
    .style("font-size", "13px")
    .style("text-align", "center")
    .style("white-space", "pre-wrap")
    // .style("text-transform", "uppercase")
    .style("font-family", "'Montserrat', sans-serif") // Apply the Google Font
    .text((d) => d.item);

  function updateCircleAndTextPosition(startTime) {
    const elapsed = Date.now() - startTime;
    const duration = 1000; // duration of the animation in milliseconds

    const updatedPosition = node.renderedPosition();
    const updatedNodeSize = node.renderedOuterWidth();
    const updatedLayerWidths = [
      updatedNodeSize * 3.5,
      updatedNodeSize * 2.5,
      updatedNodeSize * 1.5,
      updatedNodeSize / 2,
    ];

    const t = Math.min(elapsed / duration, 1); // calculate progress (0 to 1)

    svg
      .selectAll("circle")
      .attr("cx", updatedPosition.x)
      .attr("cy", updatedPosition.y);

    circles.attr("r", (d, i) => t * updatedLayerWidths[i]);

    passionGroup.attr("transform", (d, j) => {
      const r2 = updatedLayerWidths[d.i] - 37;
      const theta = ((2 * Math.PI) / d.len) * j;
      const x = updatedPosition.x + t * r2 * Math.sin(theta);
      const y = updatedPosition.y - t * r2 * Math.cos(theta);
      return `translate(${x}, ${y})`;
    });

    textElements.style("opacity", t); // transition opacity from 0 to 1

    if (t < 1) {
      requestAnimationFrame(() => updateCircleAndTextPosition(startTime));
    }
  }

  updateCircleAndTextPosition(Date.now());

  cy.animate({
    fit: {
      eles: node.closedNeighborhood(),
      padding: 310,
    },
    zoom: {
      level: 5,
      position: {
        x: node.position("x"),
        y: node.position("y"),
      },
    },
    duration: 1000,
  });
});

// ================== on EDGE click event ==================
cy.on("tap", "edge", async function (event) {
  isEdgeView = true;

  svg.selectAll(".edge-percentage-label").remove();

  // pass the edge clicked
  const edge = event.target;

  // Programmatically trigger mouseout for the currently hovered edge
  if (currentHoveredEdge) {
    const edge = currentHoveredEdge;
    const sourceNode = currentHoveredSourceNode;
    const targetNode = currentHoveredTargetNode;

    // Reset the edge size with transition
    edge.animate(
      {
        style: {
          width: 1,
          "line-color": "#ccc",
        },
      },
      {
        duration: 50,
      }
    );

    // Reset the connected nodes size and their labels with transition
    sourceNode.animate(
      {
        style: {
          width: 30,
          height: 30,
          "background-color": "white",
          "font-size": "7px",
        },
      },
      {
        duration: 50,
      }
    );

    targetNode.animate(
      {
        style: {
          width: 30,
          height: 30,
          "background-color": "white",
          "font-size": "7px",
        },
      },
      {
        duration: 50,
      }
    );

    // Remove the edge label
    svg.selectAll(".edge-label").remove();

    // Clear the current hovered edge
    currentHoveredEdge = null;
    currentHoveredSourceNode = null;
    currentHoveredTargetNode = null;
  }

  const sourceNode = edge.source();
  const targetNode = edge.target();

  cy.elements().style({
    display: "none",
  });

  document.getElementById("members").style.opacity = "0";
  document.getElementById("ai").style.opacity = "0";
  document.getElementById("wg").style.opacity = "0";

  document.getElementById("zoom-out").style.opacity = "1";

  sourceNode.style({
    display: "element",
    "text-opacity": 1,
  });
  targetNode.style({
    display: "element",
    "text-opacity": 1,
  });
  edge.style({
    display: "element",
  });

  const elements = cy.collection([sourceNode, targetNode, edge]);

  const sourcePosition = sourceNode.position();
  const targetPosition = targetNode.position();
  const centerX = (sourcePosition.x + targetPosition.x) / 2;
  const centerY = (sourcePosition.y + targetPosition.y) / 2;

  const layout = elements.layout({
    name: "cola",
    animate: true,
    fit: true,
    duration: 1000,
  });

  layout.run();

  const labelContainer = document.createElement("div");
  labelContainer.className = "edge-label";
  labelContainer.style.position = "absolute";
  labelContainer.style.background = "white";
  labelContainer.style.border = "1px solid #ccc";
  labelContainer.style.borderRadius = "15px";
  labelContainer.style.padding = "15px";
  labelContainer.style.zIndex = "9999";
  labelContainer.style.width = "500px";
  labelContainer.innerHTML = `
  <div style="display: flex; justify-content: space-between; align-items: center;">  
		<strong>AI Suggestions <span style="font-weight:600;font-size:10px;color:#ccc">(ChatGPT-4o)</span></strong>
		<strong style="color:#04DC45">${edge.data("ranking") * 100 + "%"}  Collab Rank
		</strong>
	</div>
  <p style="margin: 10px 0px">${edge.data("reason")}</p>
  <strong>Potential Collabs:</strong> 
	<ul style="margin-top: 5px;margin-bottom:0px">
		<li style="padding:5px 0px">${edge.data("potential")[0]}</li>
		<li style="padding:5px 0px">${edge.data("potential")[1]}</li>
	</ul>
  `;
  document.body.appendChild(labelContainer);

  function updateLabelPosition() {
    const updatedSourcePosition = sourceNode.renderedPosition();
    const updatedTargetPosition = targetNode.renderedPosition();
    const updatedCenterX =
      (updatedSourcePosition.x + updatedTargetPosition.x) / 2;
    const updatedCenterY =
      (updatedSourcePosition.y + updatedTargetPosition.y) / 2;

    labelContainer.style.left = `${updatedCenterX}px`;
    labelContainer.style.top = `${updatedCenterY}px`;

    requestAnimationFrame(updateLabelPosition);
  }

  updateLabelPosition();
});

// ================== on EDGE hover event ==================
cy.on("mouseover", "edge", (event) => {
  if (isEdgeView) return;

  const edge = event.target;
  const sourceNode = edge.source();
  const targetNode = edge.target();

  // this is just to programmtically mouseout on node click event
  currentHoveredEdge = edge;
  currentHoveredSourceNode = sourceNode;
  currentHoveredTargetNode = targetNode;

  // Enlarge the edge
  edge.animate(
    {
      style: {
        width: 5,
        "line-color": "#ff00ff",
      },
    },
    {
      duration: 50,
    }
  );

  // Enlarge the connected nodes and their labels
  sourceNode.animate(
    {
      style: {
        width: 100,
        height: 100,
        "background-color": "blue",
        "font-size": "16px",
      },
    },
    {
      duration: 50,
    }
  );

  targetNode.animate(
    {
      style: {
        width: 100,
        height: 100,
        "background-color": "blue",
        "font-size": "16px",
      },
    },
    {
      duration: 50,
    }
  );

  // Show the label with ranking as percentage
  const ranking = edge.data("ranking");
  const percentage = (ranking * 100).toFixed(0) + "%";

  const midpoint = {
    x: (sourceNode.position("x") + targetNode.position("x")) / 2,
    y: (sourceNode.position("y") + targetNode.position("y")) / 2,
  };

  // Append a foreignObject to ensure the label is on top
  svg
    .append("foreignObject")
    .attr("class", "edge-percentage-label")
    .attr("x", midpoint.x - 25) // Adjust to center the label
    .attr("y", midpoint.y - 10) // Adjust to center the label
    .attr("width", 100)
    .attr("height", 100)
    .append("xhtml:div")
    .style("display", "flex")
    .style("justify-content", "center")
    .style("align-items", "center")
    .style("background-color", "white")
    .style("font-family", "Roboto Condensed")
    .style("font-size", "30px")
    .text(percentage);
});

cy.on("mouseout", "edge", (event) => {
  const edge = event.target;
  const sourceNode = edge.source();
  const targetNode = edge.target();

  // Reset the edge size with transition
  edge.animate(
    {
      style: {
        width: 1,
        "line-color": "#ccc",
      },
    },
    {
      duration: 50,
    }
  );

  // Reset the connected nodes size and their labels with transition
  sourceNode.animate(
    {
      style: {
        width: 30,
        height: 30,
        "background-color": "white",
        "font-size": "7px",
      },
    },
    {
      duration: 50,
    }
  );

  targetNode.animate(
    {
      style: {
        width: 30,
        height: 30,
        "background-color": "white",
        "font-size": "7px",
      },
    },
    {
      duration: 50,
    }
  );

  // Remove the edge label
  svg.selectAll(".edge-percentage-label").remove();
});

// ================== BACK BUTTON ==================
document.getElementById("zoom-out").addEventListener("click", () => {
  isEdgeView = false;

  // Clear the contents of the SVG overlay
  svg.selectAll("*").remove();

  // Remove custom labels
  document.querySelectorAll(".edge-label").forEach((el) => el.remove());

  // Show all elements again
  cy.elements().style({
    display: "element",
    "text-opacity": 1,
  });

  // Hide the zoom-out button
  document.getElementById("zoom-out").style.opacity = "0";

  // Show other buttons
  document.getElementById("members").style.opacity = "1";
  document.getElementById("ai").style.opacity = "1";
  document.getElementById("wg").style.opacity = "1";

  if (currentView === "members") {
    // fit
    cy.animate({
      fit: {
        eles: cy.elements(),
        padding: 70,
      },
      duration: 1000,
    });
  } else {
    // AI view
    const layout = cy.elements().layout({
      name: "circle", // or any other layout you prefer
      animate: true,
      fit: true, // whether to fit to viewport
      padding: 70, // padding around layout
    });

    layout.run();
  }

  // Optionally, zoom back out
  // cy.animate({
  //   fit: {
  //     eles: cy.elements(),
  //     padding: 50,
  //   },
  //   duration: 500,
  // });
});

// ================== MEMBERS BUTTON ==================
document.getElementById("members").addEventListener("click", () => {
  currentView = "members";

  // Clear cytoscape edges
  cy.remove(cy.edges());

  // Apply a layout to the selected elements
  const layout = cy.layout({
    name: "cola", // Specify the layout name you want to use
    animate: true,
    fit: true, // Whether to fit to viewport
    //padding: 70, // Padding around layout
    duration: 1000, // Duration of the animation in milliseconds
  });

  layout.run();
});

// ================== AI BUTTON ==================
document.getElementById("ai").addEventListener("click", () => {
  currentView = "ai";

  console.log("cy", cy);

  // Update edges with matches data again
  cy.add(edges);

  // Apply a layout to the selected elements
  cy.layout({
    name: "circle", // Specify the layout name you want to use
    animate: true,
    fit: true, // Whether to fit to viewport
    padding: 70, // Padding around layout
    duration: 1000, // Duration of the animation in milliseconds
  }).run();
});
