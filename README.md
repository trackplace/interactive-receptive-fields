How to run the project:
1. Open the terminal in the project folder
2. Type "npm install" and press enter
3. Type "npm run dev" and press enter
4. click on the link that will show up in the terminal, should open webpage




Explanation for the changes I made:

After a little bit of research, it seemed like having a separate server for this project would be unnecessary, since all of the calculations needed to update the receptive field and the position/size of the light source are simple enough to run directly in the browser.

I separated the HTML and CSS that Eva wrote into two files; the HTML was adapted slightly (by claude cough cough) so that it can be put within the React application (App.jsx), and the CSS I put in the stylesheets folder as a separate file so that everything is a little more organised and easy to work with.