#!/bin/bash
gunicorn -k uvicorn.workers.UvicornWorker backend.main:app
