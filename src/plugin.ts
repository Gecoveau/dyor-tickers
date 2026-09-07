import streamDeck from "@elgato/streamdeck";

import { TickerPrice } from "./actions/ticker-price";

streamDeck.actions.registerAction(new TickerPrice());

streamDeck.connect();
