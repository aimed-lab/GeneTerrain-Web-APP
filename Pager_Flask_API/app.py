from flask import Flask, request, jsonify
from PAGER import PAGER
from flask_cors import CORS, cross_origin

app = Flask(__name__)
CORS(app)
cors = CORS(app, resource={
    r"/*":{
        "origins":"*"
    }
})

@app.route('/', methods=["GET", "POST"])
@cross_origin()
def index():
    if request.method=="POST":
        user_inputs = request.json
        print(user_inputs['genes'])
        response = PAGER().run_pager(user_inputs)
        print(type(response))
        return jsonify(response)
    else:
        return "Give me Some Information. I will call PAGER API"

@app.route('/pagRankedGene/<pagId>')
@cross_origin()
def pagRankedGene(pagId):
    response = PAGER().pagRankedGene(pagId)
    return jsonify(response)
    
if __name__=="__main__":
    app.run(debug=True)