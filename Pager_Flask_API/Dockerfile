# # FROM python:3.9.19-bullseye

# # WORKDIR /PAGER
# # COPY . /PAGER/
# # RUN pip install -r requirements.txt
# # EXPOSE 3000
# # CMD ["python3", "-m", "flask", "run", "--host=127.10.0.1"]

# FROM ubuntu

# WORKDIR /PAGER
# COPY . /PAGER/

# RUN apt update
# RUN apt install python3-pip -y
# RUN apt install python3-flask-cors -y
# RUN apt install python3-requests -y
# RUN apt install python3-numpy -y
# RUN apt install python3-pandas -y
# RUN apt install python3-flask -y
# EXPOSE 5000
# CMD ["python3", "app.py"]

FROM --platform=linux/amd64 python:3.9.19-bullseye as BUILD

WORKDIR /PAGER

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 5000

CMD ["python3", "app.py"]
