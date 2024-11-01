"use client";

import { connectWallet, disconnectWallet, useOkxAccount } from "@/okx";
import { useAccount, useConnect, useDisconnect } from "wagmi";

function App() {
	const account = useAccount();
	const { connectors, connect, status, error } = useConnect();
	const { disconnect } = useDisconnect();

	const okxAccount = useOkxAccount();

	console.log("account", account.address);
	console.log("okxAccount", okxAccount);

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

			<hr />
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
			</div>
		</>
	);
}

export default App;
