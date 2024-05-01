import OpenAI from "openai";
const Prism = require('prismjs');
// const loadLanguages = require('prismjs/components/');
// loadLanguages(['python']);

export function Chat(){
    // Initial suggestion chips
    var initialSuggestions = ["Can you provide me with information about the role of selected genes in the development and progression of GBM cancer?",
    "What are the known genetic mutations associated with selected genes in GBM cancer? How do these mutations contribute to cancer development?",
     "Can you recommend any reputable research articles or reviews that delve into the role of selected genes in GBM cancer?",
     "I would like to understand the molecular pathways and interactions involving selected genes in the context of GBM cancer. Can you provide an overview of this information?"];

    // Display suggestion chips on page load
    // document.getElementById("chat-container").addEventListener("load")
    document.getElementById("nav-api-tab").addEventListener('click',()=>{
        displaySuggestionChips(initialSuggestions);
    })

    document.getElementById("send-btn").addEventListener('click',()=>{
        sendMessage();
    })

    document.getElementById("user-message").addEventListener("keydown",(event)=>{
        handleKeyPress(event)
    })
    
    document.getElementById("hidden-input").addEventListener("change",()=>{
        // var message = "what are top genes from below genes \n"+document.getElementById("hidden-input").innerText;
        // updatePrompt(message)
    })

    async function sendMessage() {
        var userMessageDiv = document.getElementById('user-message') as HTMLInputElement;
        var userMessage = userMessageDiv.value;
        userMessageDiv.value=""
        var chatBox = document.getElementById('chat-box');
        var suggestionChips = document.getElementById('suggestion-chips');
        suggestionChips.style.display='none'
        // Display user message
        chatBox.innerHTML += '<p><strong>You:</strong><br>' + userMessage + '</p>';

        // Add logic to send user message to ChatGPT and get the response

        // For demonstration purposes, let's simulate a response from ChatGPT
        // var chatGptResponse = new Promise((resolve, reject)=>{
        //     openaiAPI(userMessage)
        // }).then((result)=>{
        //     return result
        // }).catch((error)=>{
        //     return "ChatGPT is not Responding. Please try again."
        // });
        var chatGptResponse="";
        await openaiAPI(userMessage).then((result: string)=>{
            chatGptResponse=result
        }).catch((error)=>{
            chatGptResponse='ChatGPT API is not working. Please try again.'
        });

        chatGptResponse = await parseChatGPTOutput(chatGptResponse)
        
        // Display ChatGPT response
        chatBox.innerHTML += '<p><strong>BOT:</strong><br> ' + chatGptResponse + '</p><br>';

        // Clear user input
        userMessageDiv.value = '';

        // Display new suggestion chips (you can dynamically generate these based on the context)

        // Scroll to the bottom of the chat box
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    async function displaySuggestionChips(chips) {
        var userMessage = document.getElementById('user-message') as HTMLInputElement;
        var selectedGenes = document.getElementById("hidden-input") as HTMLInputElement;
        // var chips=initialSuggestions
        var suggestionChips = document.getElementById('suggestion-chips') as HTMLDivElement;
        console.log(suggestionChips)
        suggestionChips.innerHTML = '';
        var i=0;
        chips.forEach(function(chip) {
            if(i%2==0 && i!=0)
                suggestionChips.append(document.createElement('br'))
            var chipElement = document.createElement('button') as HTMLButtonElement;
            chipElement.className = 'btn btn-light p-2';
            chipElement.style.marginLeft='20px';
            chipElement.style.marginRight='20px';
            chipElement.style.marginTop='10px';
            chipElement.innerHTML = chip;
            chipElement.onclick = function() {
                userMessage.value = chip+"\n "+selectedGenes.innerText;
                sendMessage();
            };
            suggestionChips.appendChild(chipElement);
            i++;
        });
    }

    function handleKeyPress(event) {
        if (event.key === 'Enter') {
        event.preventDefault(); // Prevents the default behavior (e.g., newline in the input field)
        sendMessage();
        }
    }

    function updatePrompt(message: string){
        var userMessageDiv = document.getElementById("user-message") as HTMLInputElement;
        userMessageDiv.value=message;
        sendMessage();
    }

}

async function parseChatGPTOutput1(response: string){
    while(response.includes('```')){
        var startIndex = response.indexOf('```')+3
        var endIndex = response.indexOf('\n',response.indexOf('```'))
        var codeLanguage = response.substring(startIndex, endIndex)
        alert(codeLanguage)
        response=response.replace('```', '<pre class="language-'+codeLanguage+'">')
        response=response.replace('```','</pre>')
    }
    console.log(response)
    return response
}

async function parseChatGPTOutput(response: string){
    while(response.includes('```')){
        var startIndex = response.indexOf('```')+3
        var endIndex = response.indexOf('\n',response.indexOf('```'))
        var codeEndIndex = response.indexOf('```',endIndex)
        var codeLanguage = response.substring(startIndex, endIndex)
        var code = response.substring(endIndex, codeEndIndex)
        // alert(codeLanguage)
        // response=response.replace('```', '<pre class="language-'+codeLanguage+'">')
        // response=response.replace('```','</pre>')
        response = response.replace('```','');
        response = response.replace('```','');
        console.log(Prism.languages)
        response = response.replace(code, Prism.highlight(code, Prism.languages.javascript, codeLanguage))
    }
    console.log(response)
    return response
}


async function openaiAPI(prompt: string){
    return ""
    // const openai = new OpenAI({ apiKey: apiKey, dangerouslyAllowBrowser: true});
    // var apiResponse: string = ''
    // // const openai = new OpenAI();
    // async function main() {
    //     const stream = await openai.chat.completions.create({
    //         model: "gpt-3.5-turbo-1106",
    //         messages: [{ role: "user", content: prompt }],
    //         // stream: true,
    //     });
    //     apiResponse = stream.choices[0].message.content;
    //     console.log(stream)
    //     // for await (const chunk of stream) {
    //     //     // alert(chunk.choices[0]?.delta?.content || "");
    //     //     // console.log(chunk.choices[0]?.delta?.content || "")
    //     //     console.log(chunk)
    //     //     apiResponse+=chunk.choices[0]?.delta?.content || "";
    //     // }
    // }
  
    // await main();
    // return apiResponse
}

  