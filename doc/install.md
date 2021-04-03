# Installation Instructions

In the most basic form, you can install all dependencies for this repository
with the command:
```bash
npm ci
```

You need at least node 12.* to run the code in this repository.

If you plan to develop genie-toolkit, you should also clone that, then use `npm link` to link everything together:

```bash
git clone https://github.com/stanford-oval/genie-toolkit
cd genie-toolkit
npm ci
npm link
cd ..

cd thingpedia-common-devices
npm ci
npm link genie-toolkit
```

## Configuration

You should create a `config.mk` at the top of the repository file containing:

```make
developer_key = <your Thingpedia developer key>
```
Do not put quotes or other markers around your key. Do not commit this file.

If you are using [genie-k8s](https://github.com/stanford-oval/genie-k8s) to integrate
with a Kubernetes cluster in AWS, you should also set:

```
s3_bucket = <bucket name> 
genie_k8s_project = <project name as specified in your genie-k8s config file>
genie_k8s_owner = <your K8s username>
```
