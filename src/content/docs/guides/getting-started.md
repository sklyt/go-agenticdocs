---
title: Getting Started
description: Smaller Models deserve love too
---


This library is a crutch, but the good kind.
Think LEGO blocks (composition over prompt-hacking) that help small models act big. I've tested on `qwen3:4b` and `qwen3:1.7b`, but it should work with most **tool-calling** models.

My thought process is simple:
If it works 80%-90% of the time on a 1GB model, then it should be a walk in the park for anything bigger(theoretically).

---

## Pre-requisites

1. Make sure you have [Ollama](https://ollama.com/) installed:

   ```bash
   ollama -v
   ```

2. Of course, you'll need [Golang](https://go.dev/):

   ```bash
   go version
   ```

3. Grab one of the Qwen [models](https://ollama.com/library/qwen3):
   (More gigabytes = more intelligence/generalization. 1GB and 4GB should cover most tasks.)

   ```bash
   ollama run qwen3:1.7b
   ollama run qwen3:4b
   ```

---

## Set Up a Go Project

```bash
go mod init github.com/qwendemo
```

1. Get the library:

   ```bash
   go get github.com/sklyt/go-agentic
   ```

2. Create a `main.go` file:

   ```go
   func main() {

   }
   ```

---

## The Most Basic Model

We’ll start with the **vanilla Ollama model**, no tools. Just raw text-in, text-out.

```go
import (
	"context"
	"fmt"
	"time"

		"github.com/sklyt/go-agentic/pkg/llm/ollama"
	    "github.com/sklyt/go-agentic/pkg/schema" // <- message types live here
)

func main() {
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
	// schema.ContentItem prepares us for future features like image/file support
	messages := []schema.Message{
		{Role: "system", Content: schema.ContentItem{Type: "text", Value: "You are a summarization assistant..."}},
		{Role: "user", Content: schema.ContentItem{Type: "text", Value: "<nothink>" + longtext + "<nothink>"}},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	output, err := model.Chat(ctx, messages, nil, true)
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

The base model implements this interface:

```go
type ModelService interface {
	Chat(ctx context.Context, messages []schema.Message, tools []any, stream bool) (<-chan schema.Response, error)
}
```

You can plug in any model adapter that implements `Chat` (e.g., Gemini, Claude, etc.).

---

## Run It

```bash
go run .
```

Done! 🎉

---

This is your foundation, the root model. Every other model builds on top of this using [interface-driven design](https://dev.to/sfundomhlungu/golang-master-class-interface-driven-design-4d10) and [struct embedding](https://dev.to/sfundomhlungu/golang-master-class-struct-embedding-3ng5).

You’ll see this pattern in models like `fn_call`, where a function-calling model embeds an Ollama model under the hood, like stacking new powers onto the base LEGO block.
