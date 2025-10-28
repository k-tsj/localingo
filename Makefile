.PHONY: init run

init:
	podman exec -it localingo-ollama ollama pull gemma2:2b

run:
	podman compose up -d
	ruby -run -e httpd . -p 8081 > /dev/null 2>&1 &
