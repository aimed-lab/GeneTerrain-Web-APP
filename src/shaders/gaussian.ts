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

  vec3 spectral(float value) {
    // Map value from [-3, 3] to [0, 1]
    float t = (value + 3.0) / 6.0;
    
    // Spectral colormap implementation
    vec3 color;
    if (t <= 0.0) {
      color = vec3(0.0, 0.0, 0.5); // Dark blue
    } else if (t <= 0.25) {
      float x = t / 0.25;
      color = vec3(0.0, x, 1.0);
    } else if (t <= 0.5) {
      float x = (t - 0.25) / 0.25;
      color = vec3(0.0, 1.0, 1.0 - x);
    } else if (t <= 0.75) {
      float x = (t - 0.5) / 0.25;
      color = vec3(x, 1.0, 0.0);
    } else if (t <= 1.0) {
      float x = (t - 0.75) / 0.25;
      color = vec3(1.0, 1.0 - x, 0.0);
    } else {
      color = vec3(0.5, 0.0, 0.0); // Dark red
    }
    return color;
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
    
    // Use spectral colormap
    vec3 color = spectral(value);
    gl_FragColor = vec4(color, 0.6);
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

  vec3 spectral(float value) {
    // Map value from [-3, 3] to [0, 1]
    float t = (value + 3.0) / 6.0;
    
    // Spectral colormap implementation
    vec3 color;
    if (t <= 0.0) {
      color = vec3(0.0, 0.0, 0.5); // Dark blue
    } else if (t <= 0.25) {
      float x = t / 0.25;
      color = vec3(0.0, x, 1.0);
    } else if (t <= 0.5) {
      float x = (t - 0.25) / 0.25;
      color = vec3(0.0, 1.0, 1.0 - x);
    } else if (t <= 0.75) {
      float x = (t - 0.5) / 0.25;
      color = vec3(x, 1.0, 0.0);
    } else if (t <= 1.0) {
      float x = (t - 0.75) / 0.25;
      color = vec3(1.0, 1.0 - x, 0.0);
    } else {
      color = vec3(0.5, 0.0, 0.0); // Dark red
    }
    return color;
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
    
    // Start with white background
    vec4 finalColor = vec4(1.0, 1.0, 1.0, 1.0);
    
    // Skip very small values entirely (keep as white background)
    if (abs(value) < 0.001) {
      gl_FragColor = finalColor;
      return;
    }
    
    // MODIFIED: Scale the value by isolineSpacing before rounding
    // This controls how many isolines are visible
    float scaledValue = value / isolineSpacing;
    float discreteValue = floor(scaledValue + 0.5);
    
    // Calculate the difference between the scaled value and discrete level
    float isoline = abs(scaledValue - discreteValue);
    
    if (isoline < lineThickness) {
      // Color the isoline based on the original value using the spectral function
      vec3 isolineColor = spectral(discreteValue * isolineSpacing); // Unscale for color
      
      // Make the isoline more distinct by increasing saturation
      isolineColor = clamp(isolineColor * 1.3, 0.0, 1.0);
      
      // Set the final color to the colored isoline
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

  vec3 spectral(float value) {
    // Map value from [-3, 3] to [0, 1]
    float t = (value + 3.0) / 6.0;
    
    // Spectral colormap implementation
    vec3 color;
    if (t <= 0.0) {
      color = vec3(0.0, 0.0, 0.5); // Dark blue
    } else if (t <= 0.25) {
      float x = t / 0.25;
      color = vec3(0.0, x, 1.0);
    } else if (t <= 0.5) {
      float x = (t - 0.25) / 0.25;
      color = vec3(0.0, 1.0, 1.0 - x);
    } else if (t <= 0.75) {
      float x = (t - 0.5) / 0.25;
      color = vec3(x, 1.0, 0.0);
    } else if (t <= 1.0) {
      float x = (t - 0.75) / 0.25;
      color = vec3(1.0, 1.0 - x, 0.0);
    } else {
      color = vec3(0.5, 0.0, 0.0); // Dark red
    }
    return color;
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
    
    // For water layer: if value is less than zero, set it to zero
    if (value < 0.0) {
      value = 0.0;
    }
    
    // Use spectral colormap
    vec3 color = spectral(value);
    gl_FragColor = vec4(color, 0.6);
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

  vec3 spectral(float value) {
    // Map value from [-3, 3] to [0, 1]
    float t = (value + 3.0) / 6.0;
    
    // Spectral colormap implementation
    vec3 color;
    if (t <= 0.0) {
      color = vec3(0.0, 0.0, 0.5); // Dark blue
    } else if (t <= 0.25) {
      float x = t / 0.25;
      color = vec3(0.0, x, 1.0);
    } else if (t <= 0.5) {
      float x = (t - 0.25) / 0.25;
      color = vec3(0.0, 1.0, 1.0 - x);
    } else if (t <= 0.75) {
      float x = (t - 0.5) / 0.25;
      color = vec3(x, 1.0, 0.0);
    } else if (t <= 1.0) {
      float x = (t - 0.75) / 0.25;
      color = vec3(1.0, 1.0 - x, 0.0);
    } else {
      color = vec3(0.5, 0.0, 0.0); // Dark red
    }
    return color;
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
    
    // For sky layer: if value is greater than zero, set it to zero
    if (value > 0.0) {
      value = 0.0;
    }
    
    // Use spectral colormap
    vec3 color = spectral(value);
    gl_FragColor = vec4(color, 0.6);
  }
`;
