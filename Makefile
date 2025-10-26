.PHONY: init run

init:
	podman exec -it localingo-ollama ollama pull gemma2:2b

run:
	podman compose up -d
	ruby -run -e httpd . > /dev/null 2>&1 &
