export const shaders = () => {
  const vertex = `
  struct TransformData {
    model: mat4x4<f32>,
    view: mat4x4<f32>,
    projection: mat4x4<f32>,
  };

    
  struct Output{
    @builtin(position) Position : vec4<f32>,
    @location(0) color : vec2<f32>,
  }

    @vertex
    fn main(
      @location(0) pos : vec4<f32>,
      @location(1) color : vec2<f32>,
    ) -> Output{
      var output: Output;
      output.Position = pos;
      output.color = color;
      return output;
    }
  `

  const fragment = `
  @group(0) @binding(0) var mySampler: sampler;
  @group(0) @binding(1) var myTexture: texture_2d<f32>;

  @fragment
  fn main(
    @location(0) color: vec2<f32>,
  ) -> @location(0) vec4<f32> {
    return textureSample(myTexture, mySampler, color);
  }
  `

  const compute = `
  
  struct Node{
    x: f32,
    y: f32,
    weight: f32,
  }
  @binding(0) @group(0) var<storage, read_write> data: array<f32>;
  @binding(1) @group(0) var<storage, read_write> x: array<f32>;
  @binding(2) @group(0) var<storage, read_write> y: array<f32>;
  @binding(3) @group(0) var<storage, read_write> weight: array<f32>;
  @binding(4) @group(0) var<storage, read_write> colors:array<f32>;
  @binding(5) @group(0) var myTexture: texture_2d<f32>;
  @binding(6) @group(0) var<storage, read_write> params: array<f32>;
  @binding(7) @group(0) var<storage, read_write> dataOnly: array<f32>;
  @binding(8) @group(0) var<storage, read_write> sigmaArray: array<f32>;
  
  @compute @workgroup_size(16)
  fn main(@builtin(global_invocation_id) id: vec3<u32>){

    var k = id.x;
    var n = arrayLength(&x);
    var m = arrayLength(&y);
    var resolution=u32(params[5]);
    var selectionLength = params[6];
    // for(var t=k;t<id.x+21;t++){
    var t=k;
      var value:f32=0;
      var i:u32=0;
      var c=t;
      c=c%(resolution*resolution);
      var xIndex=f32(c/(resolution));
      var yIndex=f32(c%(resolution));
      xIndex = xIndex/f32(resolution);
      yIndex = yIndex/f32(resolution);
      var sigma: f32 = params[0];
      // var j = t/(resolution*resolution);
      for(i=0;i<n;i=i+1){
        var square_dist = (x[i]-xIndex)*(x[i]-xIndex)+(y[i]-yIndex)*(y[i]-yIndex);
        for(var j=0;j<20;j++){
          var square_dist_updated = square_dist*sigmaArray[j];
          // square_dist = square_dist*sigma;
          dataOnly[i32(resolution*resolution)*j+i32(t)] = dataOnly[i32(resolution*resolution)*j+i32(t)]+weight[i]/((square_dist_updated+1)*selectionLength);
        }
      }
      // dataOnly[t]=dataOnly[t]+value/selectionLength;
      // var sampleSize=params[3];
      // if(params[4]==1){
      //   dataOnly[t]=dataOnly[t]/sampleSize;
      //   // for(var j=0;j<20;j++){
      //   //   dataOnly[i32(resolution*resolution)*j+i32(t)]=dataOnly[i32(resolution*resolution)*j+i32(t)]/sampleSize;
      //   // }
      // }
    
  }

  @compute @workgroup_size(1)
  fn normalize(@builtin(global_invocation_id) id: vec3<u32>){
  //   if(params[0]==0){
  //     return;
  //   }
  //   var k=id.x;
  //   var resolution=params[5];
  //   var min=resolution;
  //   var max=-resolution;
  //   var minRange=f32(params[1]);
  //   var maxRange=f32(params[2]);
  //   minRange=(minRange+10.0)/20.0;
  //   maxRange=(maxRange+10.0)/20.0;
  //   var len = arrayLength(&dataOnly);
  //   for(var i:u32=0;i<len;i++){
  //     if(min>dataOnly[i]){
  //       min=dataOnly[i];
  //     }
  //     if(max<dataOnly[i]){
  //       max=dataOnly[i];
  //     }
  //   }
  //   var v:i32;
  //   for(var i:u32=0;i<len;i+=4){
  //     data[i]=(data[i]-min)/(max-min);
  //     if(data[i]<minRange){
  //       data[i]=0;
  //     }
  //     else if(data[i]>maxRange){
  //       data[i]=1;
  //     }
  //     else{
  //       data[i]=(data[i]-minRange)/(maxRange-minRange);
  //     }
  //     data[i]=data[i]*f32(arrayLength(&colors)/4-1)+0;
  //     v=16*i32(data[i]/4);
  //     data[i]=colors[v];
  //     data[i+1]=colors[v+1];
  //     data[i+2]=colors[v+2];
  //     data[i+3]=255;
  //   }
  //   for(var i:u32=0;i<arrayLength(&dataOnly);i++){
  //     var sampleSize=params[3];
  //     if(params[4]==1){
  //       dataOnly[i]=dataOnly[i]/sampleSize;
  //     }
  //   }
  }
  
  `
  return {vertex, fragment, compute}
};