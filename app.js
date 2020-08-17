const express = require('express');
const fetch = require("node-fetch");
const Alexa = require('ask-sdk-core');
const { ExpressAdapter } = require('ask-sdk-express-adapter');

const app = express();
const port = 3000;

/* CONSTANTS */

const messages = {
    welcome: 'Welcome to your personal pokedex! What would you like to know about pokemon?',
    help: 'You can ask me for information about pokemon. Try saying: "Alexa, tell me about Pikachu," or "What height is piplup?". Would you like to continue?',
    yesResponse: 'What would you like to know about Pokemon?',
    reprompt: 'Would you like to continue?',
    fallback: 'This you personal pokedex! What would you like to know about pokemon? You can also ask me for a pokemom\'s weight, height, or type',
    end: 'This is pokedex signing off. See ya next time pokemon trainer.',
    error: 'Sorry, I can\'t understand the command. Please say again.',
}
const pokemonMessages = {
    pokemonInfo: (pokemon, pokemonTypes, pokemonHeight, pokemonWeight) => `${pokemon} is a ${pokemonTypes} type pokemon with a height of ${pokemonHeight} and a weight of ${pokemonWeight}. What else would you like to know?`,
    pokemonTraitInfo: (pokemon, trait, traitValue) => `${pokemon}'s ${trait} is ${traitValue}. What else would you like to know?`,
    pokemonNotFound: (pokemon) => `hmm, I'm not sure I know about ${pokemon}, are you sure it is a pokemon?`,
    pokemonTraitNotFound: (pokemon, trait) => `Sorry, I don't know ${pokemon}'s ${trait}. You can ask me for a pokemon\'s weight, height, or type.`,
}

/* HELPER FUNCTIONS */

function getPokemonInfo(pokemon) {
    return fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon}/`)
        .then((res) => res.json())
        .then((data) => {
            const { weight, height, types } = data
            const type = types
                .map(({ type }) => type.name)
                .join();
            return { weight, height, type, error: false }
        }).catch((error) => {
            console.log(error);
            return { error: true }
        });
}

function parseName(pokemon) {
    return pokemon
        .replace(/'s$/g, '')
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

/* INTENT HANDLERS */

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speechText = messages.welcome;

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

const PokemonInfoHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'pokemon_info';
    },
    async handle(handlerInput) {
        let pokemon = handlerInput.requestEnvelope.request.intent.slots.pokemon.value;
        let speechText = '';
        pokemon = parseName(pokemon);

        const { weight, height, type, error } = await getPokemonInfo(pokemon);
        if (error) {
            speechText = pokemonMessages.pokemonNotFound(pokemon);
        }
        else {
            speechText = pokemonMessages.pokemonInfo(pokemon, type, height, weight);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(messages.reprompt)
            .getResponse();
    }
};

const PokemonTraitHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'pokemon_trait';
    },
    async handle(handlerInput) {
        let pokemon = handlerInput.requestEnvelope.request.intent.slots.pokemon.value;
        const trait = handlerInput.requestEnvelope.request.intent.slots.trait.value;
        let speechText = '';
        pokemon = parseName(pokemon);

        if (trait === 'type' || trait === 'weight' || trait === 'height') {
            const pokemonInfo = await getPokemonInfo(pokemon);
            if (pokemonInfo.error) {
                speechText = pokemonMessages.pokemonNotFound(pokemon);
            }
            else {
                const traitValue = pokemonInfo[trait];
                speechText = pokemonMessages.pokemonTraitInfo(pokemon, trait, traitValue);
            }
        } else {
            speechText = pokemonMessages.pokemonTraitNotFound(pokemon, trait);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(messages.reprompt)
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speechText = messages.help;
        const speechTextTwo = messages.helpReprompt;

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechTextTwo)
            .getResponse();
    }
};

const YesIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent';
    },
    handle(handlerInput) {
        const speechText = messages.yesResponse;

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(messages.reprompt)
            .getResponse();
    }
};

const NoIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent';
    },
    handle(handlerInput) {
        const speechText = messages.end;

        return handlerInput.responseBuilder
            .speak(speechText)
            .withShouldEndSession(true)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
                || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speechText = messages.end;

        return handlerInput.responseBuilder
            .speak(speechText)
            .withShouldEndSession(true)
            .getResponse();
    }
};

const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speechText = messages.fallback;

        return handlerInput.responseBuilder
            .speak(speechText)
            .repromt(messages.reprompt)
            .getResponse();
    }
};

const RepeatIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.RepeatIntent';
    },
    handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const { lastResponse } = sessionAttributes;

        const speechText = lastResponse;

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(messages.reprompt)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'AMAZON.SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
        return handlerInput.responseBuilder.getResponse();
    }
};

/* RESPONSE INTERCEPTORS */

const saveResponseForRepeatInterceptor = {
    process(handlerInput) {
        const response = handlerInput.responseBuilder.getResponse().outputSpeech.ssml;
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        sessionAttributes.lastResponse = response;
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
    },
};

/* ERROR HANDLERS */

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`Error handled: ${error.message}`);

        return handlerInput.responseBuilder
            .speak(messages.error)
            .reprompt(messages.error)
            .getResponse();
    },
};

/* SETUP */

const skillBuilder = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        PokemonInfoHandler,
        PokemonTraitHandler,
        LaunchRequestHandler,
        HelpIntentHandler,
        YesIntentHandler,
        NoIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        RepeatIntentHandler,
        SessionEndedRequestHandler
    )
    .addResponseInterceptors(saveResponseForRepeatInterceptor)
    .addErrorHandlers(ErrorHandler);

const skill = skillBuilder.create();
const adapter = new ExpressAdapter(skill, true, true);

app.post('/', adapter.getRequestHandlers());

app.listen(port, () => console.log(`Server listening at http://localhost:${port}`));