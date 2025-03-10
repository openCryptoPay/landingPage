This text explains how the standard can be integrated into wallets. 


The most important thing:
Each cash register has its own static QR code which is attached with an adhesive near the cash register. 

The customer says he wants to pay with Crypto, the cashier presses the “Crypto” button. The user can then scan the QR code with their wallet and carry out the transaction. 

And that's it. 

One example QR Code:
<img width="362" alt="Bildschirmfoto 2025-03-10 um 10 06 26" src="https://github.com/user-attachments/assets/12b4ea76-221d-498d-84d9-4d08a360234c" />

The QR code contains the following information:

https://app.dfx.swiss/pl/?lightning=LNURL1DP68GURN8GHJ7CTSDYHXGENC9EEHW6TNWVHHVVF0D3H82UNVWQHHQMZLVFJK2ERYVG6RZCMYX33RVEPEV5YEJ9WT


Any cell phone can scan this QR code with the camera app. The user is then taken to the website and receives an explanation of how payment works with this QR code and OpenCryptoPay. 

<img width="531" alt="Bildschirmfoto 2025-03-10 um 10 06 53" src="https://github.com/user-attachments/assets/36a659dc-c1c5-4ba1-a9ed-7038e6228ad6" />


All compatible wallets are listed on the website, and Ammer Wallet will also appear here as a “Recommended Wallet” in the future. 

All compatible wallets use the same procedure. 

You search for the following character string in the QR code:

“?lightning=”

In our example, the result of the search is:

LNURL1DP68GURN8GHJ7CTSDYHXGENC9EEHW6TNWVHHVVF0D3H82UNVWQHHQMZLVFJK2ERYVG6RZCMYX33RVEPEV5YEJ9WT

This information is decoded. then we get:
https://api.dfx.swiss/v1/lnurlp/pl_beeddb41cd4b6d9e


Now we call this website as an API call
In response, we receive a JSON with all the information. 

{
      "method": "Ethereum",
      "minFee": 949671408,
      "assets": [
        {
          "asset": "ETH",
          "amount": 0.00052493
        },
        {
          "asset": "USDT",
          "amount": 1.146604
        },
        {
          "asset": "WBTC",
          "amount": 0.00001302
        },

minFee describes the minimum amount of gas that must be paid. 
The user's wallet can choose which method and which asset should be used. It is an option. 

For example: Send us 0.00052493 ETH or send us 1.146604 USDT

The wallet now selects a method and an asset. For example:

https://api.dfx.swiss/v1/lnurlp/cb/pl_beeddb41cd4b6d9e?quote=plq_fbd129e069375c77&asset=ZCHF&method=Polygon


Response:
{
  "expiryDate": "2025-03-07T18:58:22.708Z",
  "blockchain": "Polygon",
  "uri": "ethereum:0x02567e4b14b25549331fcee2b56c647a8bab16fd@137/transfer?address=0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC&uint256=1000000000000000000",
  "hint": "Use this data to create a transaction and sign it. Send the signed transaction back as HEX via the endpoint https://api.dfx.swiss/v1/lnurlp/tx/plp_f1ba466e2f1c0a4e. We check the transferred HEX and broadcast the transaction to the blockchain."
}

Sign a valid transaction with this data and send the HEX to 
https://api.dfx.swiss/v1/lnurlp/tx/plp_f1ba466e2f1c0a4e


DFX then gives a positive response and the transaction has been carried out correctly. 


