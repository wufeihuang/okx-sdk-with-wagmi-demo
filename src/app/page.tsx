"use client";

// import { connectWallet, disconnectWallet, useOkxAccount } from "@/okx";
import { useAccount, useConnect, useDisconnect } from "wagmi";

function App() {
	const account = useAccount();
	const { connectors, connect, status, error } = useConnect();
	const { disconnect } = useDisconnect();

	// const okxAccount = useOkxAccount();

	console.log("connectors", connectors);
	console.log("account", account.address);
	// console.log("okxAccount", okxAccount);

	return (
		<>
			<div>
				<h2>Account</h2>

				<div>
					status: {account.status}
					<br />
					addresses: {JSON.stringify(account.addresses)}
					<br />
					chainId: {account.chainId}
				</div>

				{account.status === "connected" && (
					<button type="button" onClick={() => disconnect()}>
						Disconnect
					</button>
				)}
			</div>

			<div>
				<h2>Connect</h2>
				{connectors.map((connector) => (
					<button
						key={connector.uid}
						onClick={() => connect({ connector })}
						type="button"
					>
						{connector.name}
					</button>
				))}
				<div>{status}</div>
				<div>{error?.message}</div>
			</div>

			{/* <hr />
			<div>
				<h2>Test</h2>
				<button onClick={connectWallet} type="button">
					Connect Okx
				</button>
				<button onClick={disconnectWallet} type="button">
					Disconnect Okx
				</button>
				<div>
					<span>okx account:</span>
					<span style={{ marginLeft: 10 }}>
						{okxAccount || "-"}
					</span>
				</div>
			</div> */}

			<hr />
			<div>
				<button
					onClick={() => {
						window.open(
							"https://t.me/OKX_WALLET_BOT/start?startapp=eyJva3hjb25uZWN0IjoiZXlKMGIzQnBZeUk2SWpSbVkyUmtaVE16TlRRM056WTFPV1UwWTJKbFpEUTNaRFptTmpFd1lqQTJOMkpsTTJZMlpqRmpZelZtTWpKaFlURXpabUpoTmpNd1lqZzFNVGN5WkRRaUxDSmpiR2xsYm5SSlpDSTZJbVkzTW1RNVpqY3daR0kxT1RVNVlUWTJPV1kxWmpZM1pXSXhabUpqWldNNVpUSXhOVFF4TWpSak5qVTVZakUyWmpjNU1UUTBaRFZqTnpsak56a3hNRGtpZlE9PSIsInJlZGlyZWN0IjoiYmFjayIsImV4dHJhcGFyYW1zIjoiIn0=",
						);
					}}
					type="button"
				>
					window.open Okx Miniapp
				</button>
				<br />
				<a href="https://t.me/OKX_WALLET_BOT/start?startapp=eyJva3hjb25uZWN0IjoiZXlKMGIzQnBZeUk2SWpSbVkyUmtaVE16TlRRM056WTFPV1UwWTJKbFpEUTNaRFptTmpFd1lqQTJOMkpsTTJZMlpqRmpZelZtTWpKaFlURXpabUpoTmpNd1lqZzFNVGN5WkRRaUxDSmpiR2xsYm5SSlpDSTZJbVkzTW1RNVpqY3daR0kxT1RVNVlUWTJPV1kxWmpZM1pXSXhabUpqWldNNVpUSXhOVFF4TWpSak5qVTVZakUyWmpjNU1UUTBaRFZqTnpsak56a3hNRGtpZlE9PSIsInJlZGlyZWN0IjoiYmFjayIsImV4dHJhcGFyYW1zIjoiIn0=">
					open link
				</a>
			</div>
		</>
	);
}

export default App;
