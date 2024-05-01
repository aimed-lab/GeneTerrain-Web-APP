// import OpenAI from "openai";

// // Initial suggestion chips
// var initialSuggestions = ['Hello', 'How are you?', 'Tell me a joke', 'Welcome'];

// // Display suggestion chips on page load
// // displaySuggestionChips(initialSuggestions);

// function sendMessage() {
//     var userMessage = document.getElementById('user-message').value;
//     var chatBox = document.getElementById('chat-box');
//     var suggestionChips = document.getElementById('suggestion-chips');
//     suggestionChips.style.display='none'
//     // Display user message
//     chatBox.innerHTML += '<p><strong>You:</strong> ' + userMessage + '</p>';

//     // Add logic to send user message to ChatGPT and get the response

//     // For demonstration purposes, let's simulate a response from ChatGPT
//     var chatGptResponse = 'This is a response from Bot.';

//     // Display ChatGPT response
//     chatBox.innerHTML += '<p><strong>BOT:</strong> ' + chatGptResponse + '</p>';

//     // Clear user input
//     document.getElementById('user-message').value = '';

//     // Display new suggestion chips (you can dynamically generate these based on the context)

//     // Scroll to the bottom of the chat box
//     chatBox.scrollTop = chatBox.scrollHeight;
// }

// function displaySuggestionChips(chips) {
//     var suggestionChips = document.getElementById('suggestion-chips');
//     suggestionChips.innerHTML = '';
//     var i=0;
//     chips.forEach(function(chip) {
//         if(i%2==0 && i!=0)
//             suggestionChips.append(document.createElement('br'))
//         var chipElement = document.createElement('button');
//         chipElement.className = 'btn btn-light p-2';
//         chipElement.style="margin-left:20px;margin-right:20px;margin-top:10px"
//         chipElement.innerHTML = chip;
//         chipElement.onclick = function() {
//             document.getElementById('user-message').value = chip;
//             sendMessage();
//         };
//         suggestionChips.appendChild(chipElement);
//         i++;
//     });
// }

// function handleKeyPress(event) {
//     if (event.key === 'Enter') {
//       event.preventDefault(); // Prevents the default behavior (e.g., newline in the input field)
//       sendMessage();
//     }
//   }

//   const openai = new OpenAI();
  
//   async function main() {
//       const stream = await openai.chat.completions.create({
//           model: "gpt-4",
//           messages: [{ role: "user", content: "Say this is a test" }],
//           stream: true,
//       });
//       for await (const chunk of stream) {
//           process.stdout.write(chunk.choices[0]?.delta?.content || "");
//       }
//   }
  
//   main();