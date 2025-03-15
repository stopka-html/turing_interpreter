from flask import Flask
from flask import render_template
from livereload import Server
from flask import request
from flask import jsonify
import json
import turing
app = Flask(__name__)
app.debug = True
@app.route("/")
def hello_world():
    return render_template("index.html")

@app.route("/run", methods=["POST"])
def run():
    data = request.json
    print(data)
    data = turing.init_program(data["data"],data["T_alphavit"],"q0",data["input"])
    return jsonify({"data":data})


server = Server(app.wsgi_app) # or whatever app)
server.watch("./templates/*.*")  # or what have you
server.watch("./static/*.*")
server.serve()
