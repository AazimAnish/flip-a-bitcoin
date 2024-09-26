"use client";

import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export default function Home() {
  const { address: connectedAddress } = useAccount();
  const [betAmount, setBetAmount] = useState("");

  const { data: treasuryBalance } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "treasuryBalance",
    watch: true,
  });

  const { data: minBetAmount } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "minBetAmount",
  });

  const { writeContractAsync: betAndFlipCoin, isMining } = useScaffoldWriteContract("YourContract");

  const handleBet = async () => {
    if (!betAmount) return;
    try {
      await betAndFlipCoin({
        functionName: "betAndFlipCoin",
        // Remove the explicit typing of args
        value: parseEther(betAmount),
      });
      setBetAmount("");
    } catch (error) {
      console.error("Error placing bet:", error);
    }
  };

  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-5xl font-bold mb-8">Coin Flip Game</h1>

          <div className="card w-96 bg-base-100 shadow-xl mb-8">
            <div className="card-body">
              <h2 className="card-title justify-center">Treasury Balance</h2>
              <p className="text-3xl font-bold">
                {treasuryBalance ? `${formatEther(treasuryBalance)} ETH` : "Loading..."}
              </p>
            </div>
          </div>

          {connectedAddress ? (
            <div>
              <p className="mb-4">
                Connected Address: <Address address={connectedAddress} />
              </p>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Bet Amount (ETH)</span>
                </label>
                <label className="input-group">
                  <input
                    type="number"
                    placeholder="0.1"
                    className="input input-bordered w-full"
                    value={betAmount}
                    onChange={e => setBetAmount(e.target.value)}
                    min={minBetAmount ? formatEther(minBetAmount) : "0"}
                    step="0.01"
                  />
                  <span>ETH</span>
                </label>
              </div>
              <button
                className={`btn btn-primary mt-4 ${isMining ? "loading" : ""}`}
                onClick={handleBet}
                disabled={isMining || !betAmount}
              >
                {isMining ? "Betting..." : "Bet and Flip"}
              </button>
              {minBetAmount && (
                <div className="alert alert-info mt-4">
                  <div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      className="stroke-current flex-shrink-0 w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      ></path>
                    </svg>
                    <span>Minimum bet: {formatEther(minBetAmount)} ETH</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="alert alert-warning">
              <div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current flex-shrink-0 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>Please connect your wallet to play</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
