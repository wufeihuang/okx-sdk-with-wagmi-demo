"use client";

import {
	OKXUniversalConnectUI,
	THEME,
	type Account,
	type SessionNamespace,
} from "@okxconnect/ui";
import { useEffect, useState } from "react";
import { base } from "viem/chains";

const Chain = base;

let universalUi: OKXUniversalConnectUI;
let universalUiPromise: Promise<OKXUniversalConnectUI>;

export const getOkxProvider = async () => {
	if (universalUi) {
		return Promise.resolve(universalUi);
	}

	if (!universalUiPromise) {
		console.log("%c%s", "color: #00a3cc", "cccc init");

		universalUiPromise = OKXUniversalConnectUI.init({
			dappMetaData: {
				icon: "https://static.okx.com/cdn/assets/imgs/247/58E63FEA47A2B7D7.png",
				name: "OKX WalletConnect UI Demo",
			},
			actionsConfiguration: {
				returnStrategy: "tg://resolve",
				modals: "all",
				tmaReturnUrl: "back",
			},
			language: "en_US",
			uiPreferences: {
				theme: THEME.DARK,
			},
		});
	}

	universalUi = await universalUiPromise;

	console.log("universalUi", universalUi);
	return universalUi;
};

export const connectWallet = async () => {
	console.log("fffff");
	let accounts: string[] = [];
	if (universalUi) {
		accounts = await getAccounts();
		console.log("accounts", accounts);
	}

	if (accounts.length > 0) {
		console.log("disconnect", accounts[0]);

		// return
		await universalUi.disconnect();
	}

	const session = await (await getOkxProvider()).openModal({
		namespaces: {
			eip155: {
				chains: [`eip155:${Chain.id}`],
				rpcMap: {
					[Chain.id]: Chain.rpcUrls.default.http[0],
				},
				defaultChain: String(Chain.id),
			},
		},
	});
	console.log("session", session);
};

export const disconnectWallet = async () => {
	getOkxProvider().then((provider) => {
		provider.disconnect();
	});
};

export const getAccounts = async (): Promise<string[]> => {
	return getOkxProvider().then((provider) => {
		console.log("universalUi.session", provider.session);

		if (!provider.session) {
			return [];
		}

		return provider.request({ method: "eth_requestAccounts" });
	});
};

export const parseAccount = (sessionAccountString: string) => {
	const [namespace, chainId, account] = sessionAccountString.split(":");
	return account;
};

export const useOkxAccount = () => {
	const [account, setAccount] = useState<string | null>(null);

	useEffect(() => {
		getAccounts().then((accounts) => {
			console.log("accounts", accounts);
			if (accounts.length > 0) {
				setAccount(accounts[0]);
			}
		});

		getOkxProvider().then((provider) => {
			console.log("listen events");
			provider.events.on("connect", (data: any) => {
				console.log("connect", data);
				const account = parseAccount(
					data.session.namespaces.eip155.accounts[0],
				);
				setAccount(account);
			});
			provider.events.on("session_update", (session: any) => {
				console.log("session_update", JSON.stringify(session));
			});

			provider.on("display_uri", (uri: any) => {
				console.log("display_uri", uri);
			});

			provider.on("session_delete", ({ topic }: any) => {
				console.log("session_delete", topic, "session", provider.session);
				setAccount(null);
			});

			// 同 provider.on("session_delete"
			// provider.events.on("disconnect", ({ topic }) => {
			// 	console.log("events disconnect", topic, "session", provider.session);
			// 	setAccount(null);
			// });
		});
	}, []);

	return account;
};
