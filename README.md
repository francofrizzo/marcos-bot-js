# MarcosBot

MarcosBot is a [Telegram bot](https://core.telegram.org/bots) that generates
random messages based on what it has read before. It is specially interesting
when added to group chats.

This [Typescript](https://www.typescriptlang.org/) implementation is an
adaptation of a
[previous Python version](https://github.com/francofrizzo/marcos-bot)
of the bot. The new code is more organized and clear, but some features have not
been ported yet; those are detailed in the
[Issues section](https://github.com/francofrizzo/marcos-bot-js/issues).

## How it works

For generating the messages, the bot uses a
[Markov chain](https://en.wikipedia.org/wiki/Markov_chain). Each word used in
the chat is represented by a state in the chain. The usage of two words together
in a message results in the link between those words being strengthened.

New messages are generated by a random walk on the system, which means that
every word is directly related only with its immediately previous and next
words. Therefore, the messages are vaguely resembling of typical messages in the
chat, but frequently incoherent or unexpectedly comic.

## Running the bot

After installing [Node.js](https://nodejs.org/) and the required packages
(`npm install`), the code must be compiled (`npm run build`).

You must create a Telegram Bot and get its
[Telegram Bot API](https://core.telegram.org/bots/api) token; you will be
prompted to enter it the first time you run the bot. Afterwards, you can
change it by modifying the file `local/config.json`.

Then, you can start listening to messages by simply running `npm run app`.