// Vertex shader for rendering a fullscreen quad
export const vertexShader = `
  attribute vec2 position;
  varying vec2 vUv;

  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// Fragment shader for computing Gaussian distribution
export const fragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D pointsTexture;  // Texture containing points data
  uniform sampler2D valuesTexture;  // Texture containing values data
  uniform int pointCount;
  uniform float sigma;
  uniform vec2 resolution;
  uniform vec2 offset;
  uniform float scale;

  float gaussian2D(vec2 point, vec2 center) {
    vec2 d = (point - center);
    return exp(-(d.x * d.x + d.y * d.y) / (2.0 * sigma * sigma));
  }

  // Google Maps style colormap with 9 shades per band
  // Blue (negative) -> Light Green (neutral/land) -> Red (positive)
  vec3 googleMaps(float t) {
    // Light Fresh Blue shades (Google Blue inspired) - negative values
    vec3 blue1 = vec3(0.26, 0.52, 0.96);   // Google Blue (now the deepest blue)
    vec3 blue2 = vec3(0.35, 0.60, 0.98);
    vec3 blue3 = vec3(0.45, 0.70, 1.00);
    vec3 blue4 = vec3(0.55, 0.80, 1.00);
    vec3 blue5 = vec3(0.65, 0.88, 1.00);
    vec3 blue6 = vec3(0.75, 0.92, 1.00);
    vec3 blue7 = vec3(0.85, 0.96, 1.00);
    vec3 blue8 = vec3(0.92, 0.98, 1.00);
    vec3 blue9 = vec3(0.96, 0.99, 1.00);   // Pale blue (near neutral)
    
    // Light Fresh Green shades (Google Green inspired) - neutral/land
    vec3 green1 = vec3(0.94, 0.99, 0.95);  // Near neutral pale green
    vec3 green2 = vec3(0.88, 0.98, 0.91);
    vec3 green3 = vec3(0.78, 0.95, 0.85);
    vec3 green4 = vec3(0.58, 0.90, 0.68);
    vec3 green5 = vec3(0.20, 0.66, 0.33);  // Google Green
    vec3 green6 = vec3(0.44, 0.84, 0.56);
    vec3 green7 = vec3(0.68, 0.92, 0.76);
    vec3 green8 = vec3(0.84, 0.96, 0.88);
    vec3 green9 = vec3(0.95, 0.99, 0.96);  // Pale green (near positive)
    
    // Light Fresh Red/Yellow shades (Google Red/Yellow inspired) - positive values
    vec3 red1 = vec3(1.00, 1.00, 0.90);    // Pale yellow (near neutral)
    vec3 red2 = vec3(1.00, 0.98, 0.75);
    vec3 red3 = vec3(0.98, 0.85, 0.40);
    vec3 red4 = vec3(0.98, 0.74, 0.02);    // Google Yellow
    vec3 red5 = vec3(1.00, 0.65, 0.40);
    vec3 red6 = vec3(1.00, 0.50, 0.30);
    vec3 red7 = vec3(0.92, 0.26, 0.21);    // Google Red
    vec3 red8 = vec3(0.94, 0.40, 0.35);
    vec3 red9 = vec3(0.96, 0.55, 0.50);    // Lighter Red peak (not dark)

    // Blue region (0.0 - 0.33)
    float step = 0.037;
    if (t < step) return mix(blue1, blue2, t / step);
    if (t < step*2.0) return mix(blue2, blue3, (t - step) / step);
    if (t < step*3.0) return mix(blue3, blue4, (t - step*2.0) / step);
    if (t < step*4.0) return mix(blue4, blue5, (t - step*3.0) / step);
    if (t < step*5.0) return mix(blue5, blue6, (t - step*4.0) / step);
    if (t < step*6.0) return mix(blue6, blue7, (t - step*5.0) / step);
    if (t < step*7.0) return mix(blue7, blue8, (t - step*6.0) / step);
    if (t < step*8.0) return mix(blue8, blue9, (t - step*7.0) / step);
    if (t < 0.33) return mix(blue9, green1, (t - step*8.0) / step);
    
    // Green region (0.33 - 0.66)
    float gStep = 0.037;
    float gBase = 0.33;
    if (t < gBase + gStep) return mix(green1, green2, (t - gBase) / gStep);
    if (t < gBase + gStep*2.0) return mix(green2, green3, (t - gBase - gStep) / gStep);
    if (t < gBase + gStep*3.0) return mix(green3, green4, (t - gBase - gStep*2.0) / gStep);
    if (t < gBase + gStep*4.0) return mix(green4, green5, (t - gBase - gStep*3.0) / gStep);
    if (t < gBase + gStep*5.0) return mix(green5, green6, (t - gBase - gStep*4.0) / gStep);
    if (t < gBase + gStep*6.0) return mix(green6, green7, (t - gBase - gStep*5.0) / gStep);
    if (t < gBase + gStep*7.0) return mix(green7, green8, (t - gBase - gStep*6.0) / gStep);
    if (t < gBase + gStep*8.0) return mix(green8, green9, (t - gBase - gStep*7.0) / gStep);
    if (t < 0.66) return mix(green9, red1, (t - gBase - gStep*8.0) / gStep);
    
    // Red region (0.66 - 1.0)
    float rStep = 0.038;
    float rBase = 0.66;
    if (t < rBase + rStep) return mix(red1, red2, (t - rBase) / rStep);
    if (t < rBase + rStep*2.0) return mix(red2, red3, (t - rBase - rStep) / rStep);
    if (t < rBase + rStep*3.0) return mix(red3, red4, (t - rBase - rStep*2.0) / rStep);
    if (t < rBase + rStep*4.0) return mix(red4, red5, (t - rBase - rStep*3.0) / rStep);
    if (t < rBase + rStep*5.0) return mix(red5, red6, (t - rBase - rStep*4.0) / rStep);
    if (t < rBase + rStep*6.0) return mix(red6, red7, (t - rBase - rStep*5.0) / rStep);
    if (t < rBase + rStep*7.0) return mix(red7, red8, (t - rBase - rStep*6.0) / rStep);
    if (t < rBase + rStep*8.0) return mix(red8, red9, (t - rBase - rStep*7.0) / rStep);
    return red9;
  }

  // Calculate the value and its gradient (derivative) for lighting
  void getValAndGrad(vec2 point, vec2 center, out float val, out vec2 grad) {
    vec2 d = (center - point);
    float distSq = dot(d, d);
    float g = exp(-distSq / (2.0 * sigma * sigma));
    val = g;
    grad = g * (-d / (sigma * sigma));
  }

  void main() {
    vec2 screenPos = vUv * resolution;
    vec2 worldPos = (vec2(screenPos.x, resolution.y - screenPos.y) - offset) / scale;
    
    // Accumulators
    float totalValue = 0.0;
    vec2 totalGradient = vec2(0.0);

    for(int i = 0; i < 2000; i++) {
      if (i >= pointCount) break;
      vec2 point = texture2D(pointsTexture, vec2((float(i) + 0.5) / 1024.0, 0.5)).xy;
      float pWeight = texture2D(valuesTexture, vec2((float(i) + 0.5) / 1024.0, 0.5)).r;
      
      float val;
      vec2 grad;
      getValAndGrad(point, worldPos, val, grad);

      totalValue += pWeight * val;
      totalGradient += pWeight * grad;
    }
    
    // Normalize value for color mapping (range -3 to 3 approx)
    float t = clamp((totalValue + 2.5) / 5.0, 0.0, 1.0);
    vec3 baseColor = googleMaps(t);

    // Hillshading (very subtle for bright look)
    float heightScale = 8.0 * scale; 
    vec3 normal = normalize(vec3(-totalGradient * heightScale, 1.0));

    // Light source (top)
    vec3 lightDir = normalize(vec3(0.0, 0.5, 2.0));

    // Diffuse lighting
    float diff = max(dot(normal, lightDir), 0.0);

    // Very high ambient for bright look
    vec3 ambient = vec3(0.85);

    // Combine - minimal shading effect
    vec3 terrainColor = baseColor * (ambient + diff * 0.15);
    
    // Add contour lines
    float contourSpacing = 0.5; // Spacing between contour lines
    float contourThickness = 0.03; // Thickness of contour lines
    float scaledValue = totalValue / contourSpacing;
    float discreteValue = floor(scaledValue + 0.5);
    float contourDist = abs(scaledValue - discreteValue);
    
    // Draw contour line if within threshold
    if (contourDist < contourThickness) {
      // Darker contour line color
      float contourIntensity = 1.0 - (contourDist / contourThickness);
      vec3 contourColor = vec3(0.2, 0.2, 0.2); // Dark gray contour lines
      terrainColor = mix(terrainColor, contourColor, contourIntensity * 0.6);
    }
    
    gl_FragColor = vec4(terrainColor, 0.95);
  }
`;

export const discreteFragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D pointsTexture;
  uniform sampler2D valuesTexture;
  uniform int pointCount;
  uniform float sigma;
  uniform vec2 resolution;
  uniform vec2 offset;
  uniform float scale;
  uniform float lineThickness;      // Control for line thickness
  uniform float isolineSpacing;     // NEW: Control for isoline frequency/spacing

  float gaussian2D(vec2 point, vec2 center) {
    vec2 d = (point - center);
    return exp(-(d.x * d.x + d.y * d.y) / (2.0 * sigma * sigma));
  }

  // Google Maps style colormap with 9 shades per band
  vec3 googleMaps(float t) {
    vec3 blue1 = vec3(0.26, 0.52, 0.96);
    vec3 blue2 = vec3(0.35, 0.60, 0.98);
    vec3 blue3 = vec3(0.45, 0.70, 1.00);
    vec3 blue4 = vec3(0.55, 0.80, 1.00);
    vec3 blue5 = vec3(0.65, 0.88, 1.00);
    vec3 blue6 = vec3(0.75, 0.92, 1.00);
    vec3 blue7 = vec3(0.85, 0.96, 1.00);
    vec3 blue8 = vec3(0.92, 0.98, 1.00);
    vec3 blue9 = vec3(0.96, 0.99, 1.00);
    vec3 green1 = vec3(0.94, 0.99, 0.95);
    vec3 green2 = vec3(0.88, 0.98, 0.91);
    vec3 green3 = vec3(0.78, 0.95, 0.85);
    vec3 green4 = vec3(0.58, 0.90, 0.68);
    vec3 green5 = vec3(0.20, 0.66, 0.33);
    vec3 green6 = vec3(0.44, 0.84, 0.56);
    vec3 green7 = vec3(0.68, 0.92, 0.76);
    vec3 green8 = vec3(0.84, 0.96, 0.88);
    vec3 green9 = vec3(0.95, 0.99, 0.96);
    vec3 red1 = vec3(1.00, 1.00, 0.90);
    vec3 red2 = vec3(1.00, 0.98, 0.75);
    vec3 red3 = vec3(0.98, 0.85, 0.40);
    vec3 red4 = vec3(0.98, 0.74, 0.02);
    vec3 red5 = vec3(1.00, 0.65, 0.40);
    vec3 red6 = vec3(1.00, 0.50, 0.30);
    vec3 red7 = vec3(0.92, 0.26, 0.21);
    vec3 red8 = vec3(0.94, 0.40, 0.35);
    vec3 red9 = vec3(0.96, 0.55, 0.50);

    float step = 0.037;
    if (t < step) return mix(blue1, blue2, t / step);
    if (t < step*2.0) return mix(blue2, blue3, (t - step) / step);
    if (t < step*3.0) return mix(blue3, blue4, (t - step*2.0) / step);
    if (t < step*4.0) return mix(blue4, blue5, (t - step*3.0) / step);
    if (t < step*5.0) return mix(blue5, blue6, (t - step*4.0) / step);
    if (t < step*6.0) return mix(blue6, blue7, (t - step*5.0) / step);
    if (t < step*7.0) return mix(blue7, blue8, (t - step*6.0) / step);
    if (t < step*8.0) return mix(blue8, blue9, (t - step*7.0) / step);
    if (t < 0.33) return mix(blue9, green1, (t - step*8.0) / step);
    float gStep = 0.037;
    float gBase = 0.33;
    if (t < gBase + gStep) return mix(green1, green2, (t - gBase) / gStep);
    if (t < gBase + gStep*2.0) return mix(green2, green3, (t - gBase - gStep) / gStep);
    if (t < gBase + gStep*3.0) return mix(green3, green4, (t - gBase - gStep*2.0) / gStep);
    if (t < gBase + gStep*4.0) return mix(green4, green5, (t - gBase - gStep*3.0) / gStep);
    if (t < gBase + gStep*5.0) return mix(green5, green6, (t - gBase - gStep*4.0) / gStep);
    if (t < gBase + gStep*6.0) return mix(green6, green7, (t - gBase - gStep*5.0) / gStep);
    if (t < gBase + gStep*7.0) return mix(green7, green8, (t - gBase - gStep*6.0) / gStep);
    if (t < gBase + gStep*8.0) return mix(green8, green9, (t - gBase - gStep*7.0) / gStep);
    if (t < 0.66) return mix(green9, red1, (t - gBase - gStep*8.0) / gStep);
    float rStep = 0.038;
    float rBase = 0.66;
    if (t < rBase + rStep) return mix(red1, red2, (t - rBase) / rStep);
    if (t < rBase + rStep*2.0) return mix(red2, red3, (t - rBase - rStep) / rStep);
    if (t < rBase + rStep*3.0) return mix(red3, red4, (t - rBase - rStep*2.0) / rStep);
    if (t < rBase + rStep*4.0) return mix(red4, red5, (t - rBase - rStep*3.0) / rStep);
    if (t < rBase + rStep*5.0) return mix(red5, red6, (t - rBase - rStep*4.0) / rStep);
    if (t < rBase + rStep*6.0) return mix(red6, red7, (t - rBase - rStep*5.0) / rStep);
    if (t < rBase + rStep*7.0) return mix(red7, red8, (t - rBase - rStep*6.0) / rStep);
    if (t < rBase + rStep*8.0) return mix(red8, red9, (t - rBase - rStep*7.0) / rStep);
    return red9;
  }

  void main() {
    vec2 screenPos = vUv * resolution;
    vec2 worldPos = (vec2(screenPos.x, resolution.y - screenPos.y) - offset) / scale;
    
    float value = 0.0;
    for(int i = 0; i < 2000; i++) {
      if (i >= pointCount) break;
      vec2 point = texture2D(pointsTexture, vec2((float(i) + 0.5) / 1024.0, 0.5)).xy;
      float pointValue = texture2D(valuesTexture, vec2((float(i) + 0.5) / 1024.0, 0.5)).r;
      value += pointValue * gaussian2D(worldPos, point);
    }
    
    // Standard Google Maps background color #F1F3F4
    vec4 finalColor = vec4(0.95, 0.95, 0.96, 0.0); // Transparent background
    
    if (abs(value) < 0.001) {
      gl_FragColor = finalColor;
      return;
    }
    
    float scaledValue = value / isolineSpacing;
    float discreteValue = floor(scaledValue + 0.5);
    float isoline = abs(scaledValue - discreteValue);
    
    if (isoline < lineThickness) {
      float t = clamp((discreteValue * isolineSpacing + 2.5) / 5.0, 0.0, 1.0);
      vec3 isolineColor = googleMaps(t);
      finalColor = vec4(isolineColor, 1.0);
    }
    
    gl_FragColor = finalColor;
  }
`;

export const waterFragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D pointsTexture;  // Texture containing points data
  uniform sampler2D valuesTexture;  // Texture containing values data
  uniform int pointCount;
  uniform float sigma;
  uniform vec2 resolution;
  uniform vec2 offset;
  uniform float scale;

  float gaussian2D(vec2 point, vec2 center) {
    vec2 d = (point - center);
    return exp(-(d.x * d.x + d.y * d.y) / (2.0 * sigma * sigma));
  }

  // Google Maps style colormap with 9 shades per band
  vec3 googleMaps(float t) {
    vec3 blue1 = vec3(0.26, 0.52, 0.96);
    vec3 blue2 = vec3(0.35, 0.60, 0.98);
    vec3 blue3 = vec3(0.45, 0.70, 1.00);
    vec3 blue4 = vec3(0.55, 0.80, 1.00);
    vec3 blue5 = vec3(0.65, 0.88, 1.00);
    vec3 blue6 = vec3(0.75, 0.92, 1.00);
    vec3 blue7 = vec3(0.85, 0.96, 1.00);
    vec3 blue8 = vec3(0.92, 0.98, 1.00);
    vec3 blue9 = vec3(0.96, 0.99, 1.00);
    vec3 green1 = vec3(0.94, 0.99, 0.95);
    vec3 green2 = vec3(0.88, 0.98, 0.91);
    vec3 green3 = vec3(0.78, 0.95, 0.85);
    vec3 green4 = vec3(0.58, 0.90, 0.68);
    vec3 green5 = vec3(0.20, 0.66, 0.33);
    vec3 green6 = vec3(0.44, 0.84, 0.56);
    vec3 green7 = vec3(0.68, 0.92, 0.76);
    vec3 green8 = vec3(0.84, 0.96, 0.88);
    vec3 green9 = vec3(0.95, 0.99, 0.96);
    vec3 red1 = vec3(1.00, 1.00, 0.90);
    vec3 red2 = vec3(1.00, 0.98, 0.75);
    vec3 red3 = vec3(0.98, 0.85, 0.40);
    vec3 red4 = vec3(0.98, 0.74, 0.02);
    vec3 red5 = vec3(1.00, 0.65, 0.40);
    vec3 red6 = vec3(1.00, 0.50, 0.30);
    vec3 red7 = vec3(0.92, 0.26, 0.21);
    vec3 red8 = vec3(0.94, 0.40, 0.35);
    vec3 red9 = vec3(0.96, 0.55, 0.50);

    float step = 0.037;
    if (t < step) return mix(blue1, blue2, t / step);
    if (t < step*2.0) return mix(blue2, blue3, (t - step) / step);
    if (t < step*3.0) return mix(blue3, blue4, (t - step*2.0) / step);
    if (t < step*4.0) return mix(blue4, blue5, (t - step*3.0) / step);
    if (t < step*5.0) return mix(blue5, blue6, (t - step*4.0) / step);
    if (t < step*6.0) return mix(blue6, blue7, (t - step*5.0) / step);
    if (t < step*7.0) return mix(blue7, blue8, (t - step*6.0) / step);
    if (t < step*8.0) return mix(blue8, blue9, (t - step*7.0) / step);
    if (t < 0.33) return mix(blue9, green1, (t - step*8.0) / step);
    float gStep = 0.037;
    float gBase = 0.33;
    if (t < gBase + gStep) return mix(green1, green2, (t - gBase) / gStep);
    if (t < gBase + gStep*2.0) return mix(green2, green3, (t - gBase - gStep) / gStep);
    if (t < gBase + gStep*3.0) return mix(green3, green4, (t - gBase - gStep*2.0) / gStep);
    if (t < gBase + gStep*4.0) return mix(green4, green5, (t - gBase - gStep*3.0) / gStep);
    if (t < gBase + gStep*5.0) return mix(green5, green6, (t - gBase - gStep*4.0) / gStep);
    if (t < gBase + gStep*6.0) return mix(green6, green7, (t - gBase - gStep*5.0) / gStep);
    if (t < gBase + gStep*7.0) return mix(green7, green8, (t - gBase - gStep*6.0) / gStep);
    if (t < gBase + gStep*8.0) return mix(green8, green9, (t - gBase - gStep*7.0) / gStep);
    if (t < 0.66) return mix(green9, red1, (t - gBase - gStep*8.0) / gStep);
    float rStep = 0.038;
    float rBase = 0.66;
    if (t < rBase + rStep) return mix(red1, red2, (t - rBase) / rStep);
    if (t < rBase + rStep*2.0) return mix(red2, red3, (t - rBase - rStep) / rStep);
    if (t < rBase + rStep*3.0) return mix(red3, red4, (t - rBase - rStep*2.0) / rStep);
    if (t < rBase + rStep*4.0) return mix(red4, red5, (t - rBase - rStep*3.0) / rStep);
    if (t < rBase + rStep*5.0) return mix(red5, red6, (t - rBase - rStep*4.0) / rStep);
    if (t < rBase + rStep*6.0) return mix(red6, red7, (t - rBase - rStep*5.0) / rStep);
    if (t < rBase + rStep*7.0) return mix(red7, red8, (t - rBase - rStep*6.0) / rStep);
    if (t < rBase + rStep*8.0) return mix(red8, red9, (t - rBase - rStep*7.0) / rStep);
    return red9;
  }

  void main() {
    vec2 screenPos = vUv * resolution;
    vec2 worldPos = (vec2(screenPos.x, resolution.y - screenPos.y) - offset) / scale;
    
    float value = 0.0;
    for(int i = 0; i < 2000; i++) { // Fixed loop limit for WebGL
      if (i >= pointCount) break;
      // Get the point and value from textures
      vec2 point = texture2D(pointsTexture, vec2((float(i) + 0.5) / 1024.0, 0.5)).xy;
      float pointValue = texture2D(valuesTexture, vec2((float(i) + 0.5) / 1024.0, 0.5)).r;
      value += pointValue * gaussian2D(worldPos, point);
    }
    
    // For water layer: clamp negative values to 0
    if (value < 0.0) {
      value = 0.0;
    }
    
    // Use the standard Terrain mapping
    float t = clamp((value + 2.5) / 5.0, 0.0, 1.0);
    vec3 color = googleMaps(t);
    gl_FragColor = vec4(color, 0.95);
  }
`;

export const skyFragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D pointsTexture;  // Texture containing points data
  uniform sampler2D valuesTexture;  // Texture containing values data
  uniform int pointCount;
  uniform float sigma;
  uniform vec2 resolution;
  uniform vec2 offset;
  uniform float scale;

  float gaussian2D(vec2 point, vec2 center) {
    vec2 d = (point - center);
    return exp(-(d.x * d.x + d.y * d.y) / (2.0 * sigma * sigma));
  }

  // Google Maps style colormap with 9 shades per band
  vec3 googleMaps(float t) {
    vec3 blue1 = vec3(0.26, 0.52, 0.96);
    vec3 blue2 = vec3(0.35, 0.60, 0.98);
    vec3 blue3 = vec3(0.45, 0.70, 1.00);
    vec3 blue4 = vec3(0.55, 0.80, 1.00);
    vec3 blue5 = vec3(0.65, 0.88, 1.00);
    vec3 blue6 = vec3(0.75, 0.92, 1.00);
    vec3 blue7 = vec3(0.85, 0.96, 1.00);
    vec3 blue8 = vec3(0.92, 0.98, 1.00);
    vec3 blue9 = vec3(0.96, 0.99, 1.00);
    vec3 green1 = vec3(0.94, 0.99, 0.95);
    vec3 green2 = vec3(0.88, 0.98, 0.91);
    vec3 green3 = vec3(0.78, 0.95, 0.85);
    vec3 green4 = vec3(0.58, 0.90, 0.68);
    vec3 green5 = vec3(0.20, 0.66, 0.33);
    vec3 green6 = vec3(0.44, 0.84, 0.56);
    vec3 green7 = vec3(0.68, 0.92, 0.76);
    vec3 green8 = vec3(0.84, 0.96, 0.88);
    vec3 green9 = vec3(0.95, 0.99, 0.96);
    vec3 red1 = vec3(1.00, 1.00, 0.90);
    vec3 red2 = vec3(1.00, 0.98, 0.75);
    vec3 red3 = vec3(0.98, 0.85, 0.40);
    vec3 red4 = vec3(0.98, 0.74, 0.02);
    vec3 red5 = vec3(1.00, 0.65, 0.40);
    vec3 red6 = vec3(1.00, 0.50, 0.30);
    vec3 red7 = vec3(0.92, 0.26, 0.21);
    vec3 red8 = vec3(0.94, 0.40, 0.35);
    vec3 red9 = vec3(0.96, 0.55, 0.50);

    float step = 0.037;
    if (t < step) return mix(blue1, blue2, t / step);
    if (t < step*2.0) return mix(blue2, blue3, (t - step) / step);
    if (t < step*3.0) return mix(blue3, blue4, (t - step*2.0) / step);
    if (t < step*4.0) return mix(blue4, blue5, (t - step*3.0) / step);
    if (t < step*5.0) return mix(blue5, blue6, (t - step*4.0) / step);
    if (t < step*6.0) return mix(blue6, blue7, (t - step*5.0) / step);
    if (t < step*7.0) return mix(blue7, blue8, (t - step*6.0) / step);
    if (t < step*8.0) return mix(blue8, blue9, (t - step*7.0) / step);
    if (t < 0.33) return mix(blue9, green1, (t - step*8.0) / step);
    float gStep = 0.037;
    float gBase = 0.33;
    if (t < gBase + gStep) return mix(green1, green2, (t - gBase) / gStep);
    if (t < gBase + gStep*2.0) return mix(green2, green3, (t - gBase - gStep) / gStep);
    if (t < gBase + gStep*3.0) return mix(green3, green4, (t - gBase - gStep*2.0) / gStep);
    if (t < gBase + gStep*4.0) return mix(green4, green5, (t - gBase - gStep*3.0) / gStep);
    if (t < gBase + gStep*5.0) return mix(green5, green6, (t - gBase - gStep*4.0) / gStep);
    if (t < gBase + gStep*6.0) return mix(green6, green7, (t - gBase - gStep*5.0) / gStep);
    if (t < gBase + gStep*7.0) return mix(green7, green8, (t - gBase - gStep*6.0) / gStep);
    if (t < gBase + gStep*8.0) return mix(green8, green9, (t - gBase - gStep*7.0) / gStep);
    if (t < 0.66) return mix(green9, red1, (t - gBase - gStep*8.0) / gStep);
    float rStep = 0.038;
    float rBase = 0.66;
    if (t < rBase + rStep) return mix(red1, red2, (t - rBase) / rStep);
    if (t < rBase + rStep*2.0) return mix(red2, red3, (t - rBase - rStep) / rStep);
    if (t < rBase + rStep*3.0) return mix(red3, red4, (t - rBase - rStep*2.0) / rStep);
    if (t < rBase + rStep*4.0) return mix(red4, red5, (t - rBase - rStep*3.0) / rStep);
    if (t < rBase + rStep*5.0) return mix(red5, red6, (t - rBase - rStep*4.0) / rStep);
    if (t < rBase + rStep*6.0) return mix(red6, red7, (t - rBase - rStep*5.0) / rStep);
    if (t < rBase + rStep*7.0) return mix(red7, red8, (t - rBase - rStep*6.0) / rStep);
    if (t < rBase + rStep*8.0) return mix(red8, red9, (t - rBase - rStep*7.0) / rStep);
    return red9;
  }

  void main() {
    vec2 screenPos = vUv * resolution;
    vec2 worldPos = (vec2(screenPos.x, resolution.y - screenPos.y) - offset) / scale;
    
    float value = 0.0;
    for(int i = 0; i < 2000; i++) { // Fixed loop limit for WebGL
      if (i >= pointCount) break;
      // Get the point and value from textures
      vec2 point = texture2D(pointsTexture, vec2((float(i) + 0.5) / 1024.0, 0.5)).xy;
      float pointValue = texture2D(valuesTexture, vec2((float(i) + 0.5) / 1024.0, 0.5)).r;
      value += pointValue * gaussian2D(worldPos, point);
    }
    
    // For sky layer: clamp positive values to 0
    if (value > 0.0) {
      value = 0.0;
    }
    
    // Use the standard Terrain mapping
    float t = clamp((value + 2.5) / 5.0, 0.0, 1.0);
    vec3 color = googleMaps(t);
    gl_FragColor = vec4(color, 0.95);
  }
`;
