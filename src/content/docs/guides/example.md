---
title: Getting Started
description: Smaller Models deserve love too
---

This library is a crutch. LEGO pieces to help small models act big, tested on qwen3:4b and qwen3:1.7b but should work with most **tool** calling models. my thought process is simple
if it at least works 90% of the time on a 1gb model, it should be a walk in a park for larger ones.


## Pre-requisites

1. Have [Ollama](https://ollama.com/) installed:

```bash
ollama -v
```

2. Of course the star language [Golang](https://go.dev/) 

```bash
go version
```

3. One the Qwen [models](https://ollama.com/library/qwen3) (the more jigabytes the "smater the model", 4gb and 1gb should work)

```bash
ollama run qwen3:4b
```


## Setup a Go Project 

```bash
go mod init github.com/qwendemo
```

1. Get the library

```bash 
go get github.com/sklyt/qwen-agent
```

2. Create a main.go file 


```go
func main(){
  
}

```

3. The Most Basic Model

The **ollama** model, all other models will build from it(Like LEGOS). this is the vanilla, text in text out model not tools nothing.


```go
import 	(
  "github.com/sklyt/qwen-agent/pkg/llm/ollama"
  "github.com/sklyt/qwen-agent/pkg/schema" // <- msg types here
)

func main(){

	model := ollama.NewOllamaModel(
		func(c *ollama.OllamaModelConfig) {
			c.Model = "qwen3:1.7b"
			c.APIKey = "EMPTY"
			c.BaseURL = "http://localhost:11434"
		},
	)


  longtext := `
  Build simple, secure, scalable systems with Go
  An open-source programming language supported by Google
  Easy to learn and great for teams
  Built-in concurrency and a robust standard library
  Large ecosystem of partners, communities, and tools
    
    `

  // message building
  // schema.ContentItem <- prepraring for future features like image and file types.
  messages := []schema.Message{
      {Role: "system", Content: schema.ContentItem{Type: "text", Value: "You are a summarization assistant..."}},
      {Role: "user", Content: schema.ContentItem{Type: "text", Value: "<nothink>" + longtext + "<nothink>"}},
    }


  ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
  defer cancel()

	output, err := model.Chat(ctx, messages, nil, true) // parameters: context, messages, tools(not for basic model so nil), stream

	if err != nil {
		panic(err)
	}

	for msg := range output {

		if msg.Error != nil {
			fmt.Printf("Error: %v\n", msg.Error)
			continue
		}
		fmt.Print(msg.Message.Content)
	}
}


```

4. Run The model 

```bash

go run .

```

Easy! 

All upcoming models build on this one using [interface driven design](https://dev.to/sfundomhlungu/golang-master-class-interface-driven-design-4d10) and [structs embedding](https://dev.to/sfundomhlungu/golang-master-class-struct-embedding-3ng5), as you'll in the model `fn_call` a function calling model embedds an ollama model
