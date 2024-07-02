const imageInput = document.getElementById('imageInput');
const { jsPDF } = window.jspdf;
const gridSizeRange = document.getElementById('gridSizeRange');
const squareDimensionsLabel = document.getElementById('squareDimensionsLabel');
const numColorsInput = document.getElementById('numColorsInput');
const updateColorsBtn = document.getElementById('updateColorsBtn');
const saveAsPDFBtn = document.getElementById('saveAsPDFBtn');
const canvas = document.getElementById('imageCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
let image = new Image();
let colorPalette = [];

// Default number of colors to quantize to
let numColors = parseInt(numColorsInput.value);

// Handle file upload
imageInput.addEventListener('change', function(e) {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = function(event) {
    image.onload = function() {
      quantizeColorsAndDraw();
    };
    image.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

// Handle grid size range change
gridSizeRange.addEventListener('input', function() {
  quantizeColorsAndDraw();
  updateSquareDimensionsLabel();
});

// Handle number of colors change
numColorsInput.addEventListener('input', function() {
  numColors = parseInt(numColorsInput.value);
});

// Handle update colors button click
updateColorsBtn.addEventListener('click', function() {
  quantizeColorsAndDraw();
});

// Handle save as PDF button click
saveAsPDFBtn.addEventListener('click', function() {
  saveAsPDF();
});

// Function to quantize colors and draw image with grid
function quantizeColorsAndDraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const gridSize = parseInt(gridSizeRange.value);
  const squareSize = Math.floor(gridSize); // Calculate square size based on grid size range
  const scaledWidth = image.width;
  const scaledHeight = image.height;

  // Crop dimensions based on scaled size and square size
  const cropWidth = Math.floor(scaledWidth / squareSize) * squareSize;
  const cropHeight = Math.floor(scaledHeight / squareSize) * squareSize;

  canvas.width = cropWidth;
  canvas.height = cropHeight;
  ctx.drawImage(image, 0, 0, cropWidth, cropHeight);

  // Get image data for quantization
  const imageData = ctx.getImageData(0, 0, cropWidth, cropHeight);
  const pixels = imageData.data;

  // Perform color quantization
  colorPalette = quantizeColors(pixels, numColors);

  // Draw quantized image
  for (let x = 0; x < cropWidth; x += squareSize) {
    for (let y = 0; y < cropHeight; y += squareSize) {
      const pixelIndex = (y * cropWidth + x) * 4;
      const pixelColor = {
        r: pixels[pixelIndex],
        g: pixels[pixelIndex + 1],
        b: pixels[pixelIndex + 2]
      };

      // Find closest color in the color palette
      const closestColor = findClosestColor(pixelColor, colorPalette);

      // Draw the square with the closest color
      ctx.fillStyle = `rgb(${closestColor.r}, ${closestColor.g}, ${closestColor.b})`;
      ctx.fillRect(x, y, squareSize, squareSize);
    }
  }

  // Draw grid
  ctx.strokeStyle = 'white'; // Set grid color to white
  ctx.lineWidth = 1; // Set line width for grid

  // Draw vertical grid lines
  for (let x = 0; x <= cropWidth; x += squareSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, cropHeight);
    ctx.stroke();
  }

  // Draw horizontal grid lines
  for (let y = 0; y <= cropHeight; y += squareSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(cropWidth, y);
    ctx.stroke();
  }
}

// Function to save canvas as PDF with highlighted colors
function saveAsPDF() {

  // Initial image with all colors
  const border = 10; // Border size in mm
  const canvasWidthMM = (canvas.width * 25.4) / 96; // Convert canvas width to mm (assuming 96 dpi)
  const canvasHeightMM = (canvas.height * 25.4) / 96; // Convert canvas height to mm (assuming 96 dpi)
  const pageSizeWidth = canvasWidthMM + 2 * border;
  const pageSizeHeight = canvasHeightMM + 2 * border;

  const imageDataUrl = canvas.toDataURL();
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [canvasWidthMM + 2 * border, canvasHeightMM + 2 * border]
  });

  doc.addImage(imageDataUrl, 'JPEG', border, border, canvasWidthMM, canvasHeightMM);


  // Generate pages for each color in the palette
  for (let i = 0; i < colorPalette.length; i++) {
    const color = colorPalette[i];

    // Create a new canvas to draw the highlighted color
    const highlightCanvas = document.createElement('canvas');
    highlightCanvas.width = canvas.width;
    highlightCanvas.height = canvas.height;
    const highlightCtx = highlightCanvas.getContext('2d');

    // Redraw the image with only the current color highlighted
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    for (let x = 0; x < canvas.width; x++) {
      for (let y = 0; y < canvas.height; y++) {
        const pixelIndex = (y * canvas.width + x) * 4;
        const pixelColor = {
          r: imageData.data[pixelIndex],
          g: imageData.data[pixelIndex + 1],
          b: imageData.data[pixelIndex + 2]
        };

        // Highlight the current color
        if (pixelColor.r === color.r && pixelColor.g === color.g && pixelColor.b === color.b) {
          highlightCtx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
          highlightCtx.fillRect(x, y, 1, 1);
        } else {
          // Display other colors as gray
          highlightCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          highlightCtx.fillRect(x, y, 1, 1);
        }
      }
    }
    // Draw grid lines on the highlighted canvas
    highlightCtx.strokeStyle = 'white'; // Set grid color to white
    highlightCtx.lineWidth = 1; // Set line width for grid

    // Draw vertical grid lines
    for (let x = 0; x <= canvas.width; x += gridSizeRange.valueAsNumber) {
      highlightCtx.beginPath();
      highlightCtx.moveTo(x, 0);
      highlightCtx.lineTo(x, canvas.height);
      highlightCtx.stroke();
    }

    // Draw horizontal grid lines
    for (let y = 0; y <= canvas.height; y += gridSizeRange.valueAsNumber) {
      highlightCtx.beginPath();
      highlightCtx.moveTo(0, y);
      highlightCtx.lineTo(canvas.width, y);
      highlightCtx.stroke();
    }

    // Add page to PDF
    if (i >= 0) {
      doc.addPage();
    }
    doc.addImage(highlightCanvas.toDataURL(), 'JPEG', border, border, canvasWidthMM, canvasHeightMM);
  }

  // Save PDF
  doc.save('embroidery_pattern.pdf');
}

// Function to quantize colors using k-means clustering
function quantizeColors(pixels, numColors) {
  const pixelCount = pixels.length / 4;
  const colorPoints = [];

  // Collect all colors in the image
  for (let i = 0; i < pixelCount; i++) {
    const r = pixels[i * 4];
    const g = pixels[i * 4 + 1];
    const b = pixels[i * 4 + 2];
    colorPoints.push([r, g, b]);
  }

  // Initialize k-means with random centroids
  let centroids = initializeCentroids(colorPoints, numColors);

  // Perform k-means clustering
  centroids = kMeans(colorPoints, centroids);

  // Map centroids to color objects
  const colorMap = centroids.map(c => ({ r: c[0], g: c[1], b: c[2] }));

  return colorMap;
}

// Function to initialize centroids for k-means clustering
function initializeCentroids(colorPoints, numColors) {
  const centroids = [];

  // Randomly select initial centroids
  for (let i = 0; i < numColors; i++) {
    const randomIndex = Math.floor(Math.random() * colorPoints.length);
    centroids.push(colorPoints[randomIndex]);
  }

  return centroids;
}

// Function to perform k-means clustering
function kMeans(colorPoints, centroids) {
  const assignments = new Array(colorPoints.length).fill(0);
  let changed = true;

  // Update centroids iteratively until convergence
  while (changed) {
    // Assign points to closest centroids
    for (let i = 0; i < colorPoints.length; i++) {
      const point = colorPoints[i];
      const closestCentroidIndex = findClosestCentroid(point, centroids);
      assignments[i] = closestCentroidIndex;
    }

    // Update centroids
    changed = false;
    for (let j = 0; j < centroids.length; j++) {
      const centroidPoints = [];
      for (let i = 0; i < colorPoints.length; i++) {
        if (assignments[i] === j) {
          centroidPoints.push(colorPoints[i]);
        }
      }
      if (centroidPoints.length > 0) {
        const newCentroid = calculateMean(centroidPoints);
        if (!arraysEqual(centroids[j], newCentroid)) {
          centroids[j] = newCentroid;
          changed = true;
        }
      }
    }
  }

  return centroids;
}

// Function to find closest centroid to a point
function findClosestCentroid(point, centroids) {
  let minDistance = Number.MAX_VALUE;
  let closestCentroidIndex = 0;

  for (let i = 0; i < centroids.length; i++) {
    const centroid = centroids[i];
    const distance = squaredEuclideanDistance(point, centroid);
    if (distance < minDistance) {
      minDistance = distance;
      closestCentroidIndex = i;
    }
  }

  return closestCentroidIndex;
}

// Function to calculate mean of points (centroid)
function calculateMean(points) {
  const numPoints = points.length;
  let sum = [0, 0, 0];

  for (let i = 0; i < numPoints; i++) {
    sum[0] += points[i][0];
    sum[1] += points[i][1];
    sum[2] += points[i][2];
  }

  return [
    Math.round(sum[0] / numPoints),
    Math.round(sum[1] / numPoints),
    Math.round(sum[2] / numPoints)
  ];
}

// Function to calculate squared Euclidean distance between two points
function squaredEuclideanDistance(point1, point2) {
  const d0 = point1[0] - point2[0];
  const d1 = point1[1] - point2[1];
  const d2 = point1[2] - point2[2];
  return d0 * d0 + d1 * d1 + d2 * d2;
}

// Function to find closest color in color map
function findClosestColor(pixelColor, colorMap) {
  let minDistance = Number.MAX_VALUE;
  let closestColor = null;

  for (let i = 0; i < colorMap.length; i++) {
    const color = colorMap[i];
    const distance = squaredEuclideanDistance([pixelColor.r, pixelColor.g, pixelColor.b], [color.r, color.g, color.b]);
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = color;
    }
  }

  return closestColor;
}

// Function to update square dimensions label
function updateSquareDimensionsLabel() {
  const gridSize = parseInt(gridSizeRange.value);
  const squareSize = Math.floor(gridSize); // Calculate square size based on grid size range
  const scaledWidth = image.width;
  const scaledHeight = image.height;

  // Calculate number of squares in each dimension
  const numCols = Math.floor(scaledWidth / squareSize);
  const numRows = Math.floor(scaledHeight / squareSize);

  squareDimensionsLabel.textContent = ` (${numCols}x${numRows})`;
}

// Function to check if two arrays are equal
function arraysEqual(arr1, arr2) {
  return arr1.length === arr2.length && arr1.every((value, index) => value === arr2[index]);
}

