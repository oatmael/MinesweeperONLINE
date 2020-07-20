# MinesweeperONLINE
A very stupid multiplayer minesweeper clone for the web where everyone interacts with the same game at the same time. It's as bad as it sounds.

I'm going to be completely honest with you, halve of these commits where made while I was wildly drunk 
(I spent like 5 commits trying to fix a stupid bug where I used the wrong variables in a nested for loop, don't worry about it).

This code is not great. It works perfectly fine for a small number of clients, but I fully predict that this will break at anything more than 10-20 clients.

Nice and dockerized for your deployment pleasure! (Just change the address of the client.html websocket connection string. Could I have done something better for that purpose? 
Absolutely. Does this dumpsterfire even deserve such configuration options? Absolutely not.)

To see it in action, see http://minesweeperonline.ga/ (if I haven't let the domain name expire, which I very likely will have)

Bottom line, this was a fun weekend project that allowed me to familiarize myself with websockets. 
Many improvements to be made, using dynamic content over client-side javascript scripts, optimization of server broadcasts,
a solution for 2d grid manipulation that isn't O(n²)??? So much to think about. But not today.
