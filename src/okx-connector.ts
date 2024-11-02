import {
	OKXUniversalConnectUI,
	THEME,
	type OKXConnectUiOptions,
	type UniversalProviderOpts,
} from "@okxconnect/ui";
import {
	ChainNotConfiguredError,
	type Connector,
	createConnector,
	type CreateConnectorFn,
} from "@wagmi/core";
import {
	type AddEthereumChainParameter,
	type Address,
	type Hex,
	type ProviderConnectInfo,
	type ProviderRpcError,
	ResourceUnavailableRpcError,
	type RpcError,
	SwitchChainError,
	UserRejectedRequestError,
	getAddress,
	hexToNumber,
	numberToHex,
	withRetry,
	withTimeout,
} from "viem";

type OKXUniversalConnectUiCreateOptions = UniversalProviderOpts &
	OKXConnectUiOptions;

let connectorFn: CreateConnectorFn | undefined;

okxWallet.type = "okxWallet" as const;
export function okxWallet(options?: OKXUniversalConnectUiCreateOptions) {
	type Provider = OKXUniversalConnectUI;
	type Properties = {
		onConnect(connectInfo: ProviderConnectInfo): void;
		onDisplayUri(uri: string): void;
	};
	type Listener = Parameters<Provider["on"]>[1];

	if (connectorFn) {
		return connectorFn;
	}

	let provider: Provider | undefined;
	let providerPromise: Promise<typeof provider>;

	let accountsChanged: Connector["onAccountsChanged"] | undefined;
	let chainChanged: Connector["onChainChanged"] | undefined;
	let connect: Connector["onConnect"] | undefined;
	let displayUri: ((uri: string) => void) | undefined;
	let disconnect: Connector["onDisconnect"] | undefined;

	console.log("%c%s", "color: #ff0000", "ccc call okxWallet", Date.now());

	connectorFn = createConnector<Provider, Properties>((config) => ({
		id: "okxWalletSDK",
		name: "Okx Wallet",
		rdns: "com.okx",
		type: okxWallet.type,
		async setup() {
			console.log("setup", Date.now());
			const provider = await this.getProvider();
			console.log("setup", provider, !!connect);
			if (provider?.events) {
				if (!connect) {
					connect = this.onConnect.bind(this);
					provider.events.on("connect", connect as Listener);
				}

				// We shouldn't need to listen for `'accountsChanged'` here since the `'connect'` event should suffice (and wallet shouldn't be connected yet).
				// Some wallets, like MetaMask, do not implement the `'connect'` event and overload `'accountsChanged'` instead.
				// if (!accountsChanged) {
				// 	accountsChanged = this.onAccountsChanged.bind(this);
				// 	provider.on("accountsChanged", accountsChanged as Listener);
				// }
			}
		},
		async connect({ chainId, isReconnecting } = {}) {
			const provider = await this.getProvider();
			if (!displayUri) {
				displayUri = this.onDisplayUri;
				provider.on("display_uri", displayUri as Listener);
			}

			let accounts: readonly Address[] = [];
			if (isReconnecting) accounts = await this.getAccounts().catch(() => []);

			try {
				if (!accounts?.length) {
					// TODO
					const chain = config.chains[0];
					await provider.openModal({
						namespaces: {
							eip155: {
								chains: [`eip155:${chain.id}`],
								rpcMap: {
									[chain.id]: chain.rpcUrls.default.http[0],
								},
								defaultChain: String(chain.id),
							},
						},
					});

					accounts = await this.getAccounts().catch(() => []);
				}

				// Switch to chain if provided
				let currentChainId = (await this.getChainId()) as number;
				if (chainId && currentChainId !== chainId) {
					// biome-ignore lint/style/noNonNullAssertion: <explanation>
					const chain = await this.switchChain!({ chainId }).catch((error) => {
						if (error.code === UserRejectedRequestError.code) throw error;
						return { id: currentChainId };
					});
					currentChainId = chain?.id ?? currentChainId;
				}

				if (displayUri) {
					provider.removeListener("display_uri", displayUri);
					displayUri = undefined;
				}

				// Manage EIP-1193 event listeners
				// https://eips.ethereum.org/EIPS/eip-1193#events
				if (connect) {
					provider.events.removeListener("connect", connect);
					connect = undefined;
				}
				// if (!accountsChanged) {
				// 	accountsChanged = this.onAccountsChanged.bind(this);
				// 	provider.on("accountsChanged", accountsChanged as Listener);
				// }
				// if (!chainChanged) {
				// 	chainChanged = this.onChainChanged.bind(this);
				// 	provider.on("chainChanged", chainChanged as Listener);
				// }
				if (!disconnect) {
					disconnect = this.onDisconnect.bind(this);
					provider.events.on("disconnect", disconnect as Listener);
				}

				return { accounts, chainId: currentChainId };
			} catch (err) {
				const error = err as RpcError;
				if (error.code === UserRejectedRequestError.code)
					throw new UserRejectedRequestError(error);
				if (error.code === ResourceUnavailableRpcError.code)
					throw new ResourceUnavailableRpcError(error);
				throw error;
			}
		},
		async disconnect() {
			const provider = await this.getProvider();

			// Manage EIP-1193 event listeners
			// if (chainChanged) {
			// 	provider.removeListener("chainChanged", chainChanged);
			// 	chainChanged = undefined;
			// }
			if (disconnect) {
				provider.events.removeListener("disconnect", disconnect);
				disconnect = undefined;
			}
			if (!connect) {
				connect = this.onConnect.bind(this);
				provider.events.on("connect", connect as Listener);
			}

			await provider.disconnect();
		},
		async getAccounts() {
			const provider = await this.getProvider();
			if (!provider.session) {
				return [];
			}

			const accounts = (await provider.request({
				method: "eth_requestAccounts",
			})) as string[];
			return accounts.map((x) => getAddress(x));
		},
		async getChainId() {
			const provider = await this.getProvider();
			const chainId = await provider?.request({ method: "eth_chainId" });
			return Number(chainId);
		},
		async getProvider() {
			async function initProvider() {
				// Unwrapping import for Vite compatibility.
				// See: https://github.com/vitejs/vite/issues/9703
				// const { OKXUniversalConnectUI, THEME } = await (async () => {
				// 	const { OKXUniversalConnectUI, THEME } = await import(
				// 		"@okxconnect/ui"
				// 	);

				// 	return { OKXUniversalConnectUI, THEME };
				// })();

				const defaultOptions: OKXUniversalConnectUiCreateOptions = {
					dappMetaData: {
						icon: "https://app.cygnus.finance/favicon.svg",
						name: "Cygnus Finance",
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
				};

				return OKXUniversalConnectUI.init(
					Object.assign(defaultOptions, options || {}),
				).catch((e) => {
					// 服务端运行会出错，document is not defined，此时直接捕获忽略
					return undefined;
				});
			}

			if (!provider) {
				if (!providerPromise) providerPromise = initProvider();
				provider = await providerPromise;
			}
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			return provider!;
		},
		async isAuthorized() {
			try {
				// MetaMask mobile provider sometimes fails to immediately resolve
				// JSON-RPC requests on page load
				const timeout = 200;
				const accounts = await withRetry(
					() => withTimeout(() => this.getAccounts(), { timeout }),
					{
						delay: timeout + 1,
						retryCount: 3,
					},
				);
				return !!accounts.length;
			} catch {
				return false;
			}
		},
		async switchChain({ addEthereumChainParameter, chainId }) {
			const provider = await this.getProvider();

			const chain = config.chains.find((x) => x.id === chainId);
			if (!chain) throw new SwitchChainError(new ChainNotConfiguredError());

			try {
				await Promise.all([
					provider
						.request({
							method: "wallet_switchEthereumChain",
							params: [{ chainId: numberToHex(chainId) }],
						})
						// During `'wallet_switchEthereumChain'`, MetaMask makes a `'net_version'` RPC call to the target chain.
						// If this request fails, MetaMask does not emit the `'chainChanged'` event, but will still switch the chain.
						// To counter this behavior, we request and emit the current chain ID to confirm the chain switch either via
						// this callback or an externally emitted `'chainChanged'` event.
						// https://github.com/MetaMask/metamask-extension/issues/24247
						.then(async () => {
							const currentChainId = await this.getChainId();
							if (currentChainId === chainId)
								config.emitter.emit("change", { chainId });
						}),
					new Promise<void>((resolve) => {
						const listener = ((data) => {
							if ("chainId" in data && data.chainId === chainId) {
								config.emitter.off("change", listener);
								resolve();
							}
						}) satisfies Parameters<typeof config.emitter.on>[1];
						config.emitter.on("change", listener);
					}),
				]);
				return chain;
			} catch (err) {
				const error = err as RpcError;

				// Indicates chain is not added to provider
				if (
					error.code === 4902 ||
					// Unwrapping for MetaMask Mobile
					// https://github.com/MetaMask/metamask-mobile/issues/2944#issuecomment-976988719
					(error as ProviderRpcError<{ originalError?: { code: number } }>)
						?.data?.originalError?.code === 4902
				) {
					try {
						const { default: blockExplorer, ...blockExplorers } =
							chain.blockExplorers ?? {};
						let blockExplorerUrls: string[] | undefined;
						if (addEthereumChainParameter?.blockExplorerUrls)
							blockExplorerUrls = addEthereumChainParameter.blockExplorerUrls;
						else if (blockExplorer)
							blockExplorerUrls = [
								blockExplorer.url,
								...Object.values(blockExplorers).map((x) => x.url),
							];

						let rpcUrls: readonly string[];
						if (addEthereumChainParameter?.rpcUrls?.length)
							rpcUrls = addEthereumChainParameter.rpcUrls;
						else rpcUrls = [chain.rpcUrls.default?.http[0] ?? ""];

						const addEthereumChain = {
							blockExplorerUrls,
							chainId: numberToHex(chainId),
							chainName: addEthereumChainParameter?.chainName ?? chain.name,
							iconUrls: addEthereumChainParameter?.iconUrls,
							nativeCurrency:
								addEthereumChainParameter?.nativeCurrency ??
								chain.nativeCurrency,
							rpcUrls,
						} satisfies AddEthereumChainParameter;

						await provider.request({
							method: "wallet_addEthereumChain",
							params: [addEthereumChain],
						});

						const currentChainId = hexToNumber(
							// Call `'eth_chainId'` directly to guard against `this.state.chainId` (via `provider.getChainId`) being stale.
							(await provider.request({ method: "eth_chainId" })) as Hex,
						);
						if (currentChainId !== chainId)
							throw new UserRejectedRequestError(
								new Error("User rejected switch after adding network."),
							);

						return chain;
					} catch (error) {
						throw new UserRejectedRequestError(error as Error);
					}
				}

				if (error.code === UserRejectedRequestError.code)
					throw new UserRejectedRequestError(error);
				throw new SwitchChainError(error);
			}
		},
		async onAccountsChanged(accounts) {
			// Disconnect if there are no accounts
			if (accounts.length === 0) {
				// ... and using browser extension
				// if (sdk.isExtensionActive()) this.onDisconnect();
				// // FIXME(upstream): Mobile app sometimes emits invalid `accountsChanged` event with empty accounts array
				// else return;
			}
			// Connect if emitter is listening for connect event (e.g. is disconnected and connects through wallet interface)
			else if (config.emitter.listenerCount("connect")) {
				const chainId = (await this.getChainId()).toString();
				this.onConnect({ chainId });
			}
			// Regular change event
			else
				config.emitter.emit("change", {
					accounts: accounts.map((x) => getAddress(x)),
				});
		},
		onChainChanged(chain) {
			const chainId = Number(chain);
			config.emitter.emit("change", { chainId });
		},
		async onConnect(connectInfo) {
			const accounts = await this.getAccounts();
			if (accounts.length === 0) return;

			const chainId = Number(connectInfo.chainId);
			config.emitter.emit("connect", { accounts, chainId });

			const provider = await this.getProvider();
			if (connect) {
				provider.events.removeListener("connect", connect);
				connect = undefined;
			}
			// if (!accountsChanged) {
			// 	accountsChanged = this.onAccountsChanged.bind(this);
			// 	provider.on("accountsChanged", accountsChanged as Listener);
			// }
			// if (!chainChanged) {
			// 	chainChanged = this.onChainChanged.bind(this);
			// 	provider.on("chainChanged", chainChanged as Listener);
			// }
			if (!disconnect) {
				disconnect = this.onDisconnect.bind(this);
				provider.events.on("disconnect", disconnect as Listener);
			}
		},
		async onDisconnect(error) {
			const provider = await this.getProvider();

			// If MetaMask emits a `code: 1013` error, wait for reconnection before disconnecting
			// https://github.com/MetaMask/providers/pull/120
			if (error && (error as RpcError<1013>).code === 1013) {
				if (provider && !!(await this.getAccounts()).length) return;
			}

			config.emitter.emit("disconnect");

			// Manage EIP-1193 event listeners
			if (chainChanged) {
				provider.removeListener("chainChanged", chainChanged);
				chainChanged = undefined;
			}
			if (disconnect) {
				provider.removeListener("disconnect", disconnect);
				disconnect = undefined;
			}
			if (!connect) {
				connect = this.onConnect.bind(this);
				provider.on("connect", connect as Listener);
			}
		},
		onDisplayUri(uri) {
			config.emitter.emit("message", { type: "display_uri", data: uri });
		},
	}));

	return connectorFn;
}
