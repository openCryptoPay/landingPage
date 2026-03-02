# Open CryptoPay

Open CryptoPay is a permissionless and open payment standard. It enables crypto payments in a wide range of applications, e.g. for payments in web shops or physical stores or invoice payments.

The following explains how crypto wallets can use the Open CryptoPay standard to interact with crypto-enabled cash registers to allow users to pay with their cryptos in stores.

All examples use the domain of DFX.swiss but this is not mandatory. Everyone is authorized to offer an OpenCryptoPay service under their own domain. 

## Basic Principle

Every cash register is equipped with a dedicated static QR code, which is attached with an adhesive near the cash register. The QR code contains encoded information about the associated cash register and has two purposes.  
On the one hand, it contains a link to a website, which means it can be scanned with any mobile phone camera. The website (example screenshots below) shows information on the pending payment at the associated cash register, a list of supported crypto wallets and basic information on how the user can execute the payment.  
Crypto wallets, on the other hand, can decode the information directly from the link and thus initiate the payment via HTTP calls to the payment provider.

Below are sample screenshots of the linked website.

<img width="531" alt="Website screenshots" src="https://github.com/user-attachments/assets/36a659dc-c1c5-4ba1-a9ed-7038e6228ad6" />

To pay with crypto in a store, users only need to tell the cashier that they want to pay with crypto, scan the QR code with their preferred wallet and carry out the crypto transaction.

## Crypto Wallet Integration

To integrate with the standard, a crypto wallet must follow the steps outlined below.

1. Read and decode the QR code
1. Get payment details
1. Get transaction details
1. Execute the crypto transaction

Steps 2 and 3 can be simplified into a single HTTP call (see [below](#simplified-flow)).

### 1. QR Code Decoding

This is an example Open CryptoPay QR code.

<img width="362" alt="Example QR" src="https://github.com/user-attachments/assets/12b4ea76-221d-498d-84d9-4d08a360234c" />

It contains the following URL, which points to the informative website described above: https://app.dfx.swiss/pl/?lightning=LNURL1DP68GURN8GHJ7CTSDYHXGENC9EEHW6TNWVHHVVF0D3H82UNVWQHHQMZLVFJK2ERYVG6RZCMYX33RVEPEV5YEJ9WT

Information about the associated cash register can be found in the `lightning` query parameter, which is an LNURL-encoded API URL. In the above example the parameter is `LNURL1DP68GURN8GHJ7CTSDYHXGENC9EEHW6TNWVHHVVF0D3H82UNVWQHHQMZLVFJK2ERYVG6RZCMYX33RVEPEV5YEJ9WT`.

### 2. Payment Details

The wallet needs to do an HTTP call to fetch the payment details. The URL can be constructed either by (A) decoding the extracted parameter (recommended) or by (B) tweaking the link in the QR (simpler).

#### A. LNURL Decoding

The `lightning` parameter can be decoded following the [LUD-01 standard](https://github.com/lnurl/luds/blob/luds/01.md) (uses bech32-encoding) which returns the API URL. In our example, the decoded URL is https://api.dfx.swiss/v1/lnurlp/pl_beeddb41cd4b6d9e.

#### B. URL Tweaking

The URL can be constructed by replacing `app` with `api` in the URL from the QR code. In the example above this would be https://api.dfx.swiss/pl/?lightning=LNURL1DP68GURN8GHJ7CTSDYHXGENC9EEHW6TNWVHHVVF0D3H82UNVWQHHQMZLVFJK2ERYVG6RZCMYX33RVEPEV5YEJ9WT.

A GET HTTP call to either of these endpoints will return a JSON with the following structure. It contains recipient details, quote information, a list of available payment methods and crypto assets and the callback URL to fetch the transaction details. Some payment methods might be flagged as unavailable.

```JSON
{
  "id": "pl_beeddb41cd4b6d9e",
  "externalId": "TestfürAlle",
  "mode": "Multiple",
  "tag": "payRequest",
  "callback": "https://api.dfx.swiss/v1/lnurlp/cb/pl_beeddb41cd4b6d9e",
  "minSendable": 1069000,
  "maxSendable": 1069000,
  "metadata": "[[\"text/plain\", \"Test Shop - CHF 1\"]]",
  "displayName": "Test Shop",
  "standard": "OpenCryptoPay",
  "possibleStandards": ["OpenCryptoPay"],
  "displayQr": true,
  "recipient": {
    "name": "My Company",
    "address": {
      "street": "Example Street",
      "houseNumber": "7",
      "zip": "6300",
      "city": "Zug",
      "country": "CH"
    },
    "phone": "+123456789",
    "mail": "mail@my-company.com",
    "website": "https://my-company.com/",
    "registrationNumber": "CHE-123.456.789",
    "storeType": "Physical",
    "merchantCategory": "RetailTradeOthers",
    "goodsType": "Tangible",
    "goodsCategory": "FoodGroceryHealthProducts"
  },
  "route": "DFX VM 01",
  "quote": {
    "id": "plq_d170b11b44340eb1",
    "expiration": "2025-07-16T01:20:06.476Z",
    "payment": "plp_f1ba466e2f1c0a4e"
  },
  "requestedAmount": {
    "asset": "CHF",
    "amount": 1
  },
  "transferAmounts": [
    {
      "method": "Lightning",
      "minFee": 0,
      "assets": [
        {
          "asset": "BTC",
          "amount": "0.00001069"
        }
      ],
      "available": true
    },
    {
      "method": "Polygon",
      "minFee": 36000000139,
      "assets": [ ... ],
      "available": true
    },
    {
      "method": "Arbitrum",
      "minFee": 12000000,
      "assets": [ ... ],
      "available": true
    },
    {
      "method": "Optimism",
      "minFee": 1200769,
      "assets": [ ... ],
      "available": true
    },
    {
      "method": "Base",
      "minFee": 5233418,
      "assets": [ ... ],
      "available": true
    },
    {
      "method": "Ethereum",
      "minFee": 1682009661,
      "assets": [
        {
          "asset": "dEURO",
          "amount": "1.08608535"
        },
        {
          "asset": "ZCHF",
          "amount": "1."
        },
        {
          "asset": "USDT",
          "amount": "1.26157"
        },
        {
          "asset": "USDC",
          "amount": "1.261582"
        },
        {
          "asset": "DAI",
          "amount": "1.26158231"
        },
        {
          "asset": "ETH",
          "amount": "0.00040256"
        },
        {
          "asset": "WBTC",
          "amount": "0.00001069"
        }
      ],
      "available": true
    },
    {
      "method": "BinanceSmartChain",
      "minFee": 1000000000,
      "assets": [
        {
          "asset": "USDT",
          "amount": "1.26157"
        },
        {
          "asset": "USDC",
          "amount": "1.261582"
        },
        {
          "asset": "DAI",
          "amount": "1.26158231"
        },
        {
          "asset": "BNB",
          "amount": "0.00168"
        }
      ],
      "available": true
    },
    {
      "method": "Bitcoin",
      "minFee": 4.5,
      "assets": [
        {
          "asset": "BTC",
          "amount": "0.00001069"
        }
      ],
      "available": true
    },
    {
      "method": "Firo",
      "minFee": 0,
      "assets": [
        {
          "asset": "FIRO",
          "amount": "0.58823529"
        }
      ],
      "available": true
    },
    {
      "method": "Monero",
      "minFee": 0,
      "assets": [
        {
          "asset": "XMR",
          "amount": "0.00377501"
        }
      ],
      "available": true
    },
    {
      "method": "Zano",
      "minFee": 0,
      "assets": [
        {
          "asset": "ZANO",
          "amount": "0.58823529"
        }
      ],
      "available": true
    },
    {
      "method": "Solana",
      "minFee": 0,
      "assets": [ ... ],
      "available": true
    },
    {
      "method": "Tron",
      "minFee": 0,
      "assets": [ ... ],
      "available": true
    },
    {
      "method": "Cardano",
      "minFee": 0,
      "assets": [
        {
          "asset": "ADA",
          "amount": "4.883112"
        }
      ],
      "available": true
    },
    {
      "method": "BinancePay",
      "minFee": 0,
      "assets": [
        {
          "asset": "USDT",
          "amount": "1.2615697"
        }
      ],
      "available": true
    },
    {
      "method": "TaprootAsset",
      "minFee": 0,
      "assets": [],
      "available": false
    },
    {
      "method": "Spark",
      "minFee": 0,
      "assets": [],
      "available": false
    },
    {
      "method": "InternetComputer",
      "minFee": 0,
      "assets": [
        {
          "asset": "ICP",
          "amount": "0.08415"
        },
        {
          "asset": "ckBTC",
          "amount": "0.00001069"
        },
        {
          "asset": "ckETH",
          "amount": "0.00040256"
        },
        {
          "asset": "ckUSDC",
          "amount": "1.261582"
        },
        {
          "asset": "ckUSDT",
          "amount": "1.26157"
        }
      ],
      "available": true
    }
  ]
}
```

The `recipient` object includes additional fields describing the merchant:
- `registrationNumber`: Company registration number (e.g. Swiss UID)
- `storeType`: Type of store (`Physical`, `Online`, etc.)
- `merchantCategory`: Category of the merchant
- `goodsType`: Type of goods (`Tangible`, `Intangible`)
- `goodsCategory`: Category of goods being sold

Please note that the offer has an expiry date after which it can no longer be used. If a quote has expired, the wallet should fetch a new one (as explained above) to get the latest exchange rates.

#### Exceptions

If no payment is currently pending at the involved cash register, the above HTTP call waits for a payment for 10 seconds by default. This timeout can be customized with the `timeout` query parameter (in seconds). E.g. use https://api.dfx.swiss/v1/lnurlp/pl_beeddb41cd4b6d9e?timeout=0 for an instant response.

If there is still no payment pending after the waiting time has elapsed, an HTTP 404 is returned with the following content.

```JSON
{
  "id": "pl_beeddb41cd4b6d9e",
  "externalId": "a-custom-id",
  "displayName": "Test Shop",
  "standard": "OpenCryptoPay",
  "possibleStandards": ["OpenCryptoPay"],
  "displayQr": true,
  "recipient": {
    "name": "My Company",
    "address": {
      "street": "Example Street",
      "houseNumber": "7",
      "zip": "6300",
      "city": "Zug",
      "country": "CH"
    },
    "phone": "+123456789",
    "mail": "mail@my-company.com",
    "website": "https://my-company.com/",
    "registrationNumber": "CHE-123.456.789",
    "storeType": "Physical",
    "merchantCategory": "RetailTradeOthers",
    "goodsType": "Tangible",
    "goodsCategory": "FoodGroceryHealthProducts"
  },
  "statusCode": 404,
  "message": "No pending payment found",
  "error": "Not Found"
}

```

### 3. Transaction Details

Based on the JSON received, the wallet should now select a transfer method and an asset (e.g. pay with 0.0006582 ETH on Ethereum). It also needs to extract the quote ID (`quote.id` field). These three values are used as query parameters with the callback URL (`callback` field) to fetch the relevant transaction details (`{callbackUrl}?quote={quote-id}&method={selected-method}&asset={selected-asset}`).

In our example the URL to fetch the transaction details for a payment in ETH on Ethereum blockchain would be https://api.dfx.swiss/v1/lnurlp/cb/pl_beeddb41cd4b6d9e?quote=plq_9af8927afe14f2d0&method=Ethereum&asset=ETH.

A GET HTTP call to this endpoint will return a JSON with the following structure.

```JSON
// EVM chains (Ethereum, Polygon, Arbitrum, Optimism, Base, BinanceSmartChain), Bitcoin and Firo
{
  "expiryDate": "2025-05-01T14:34:40.881Z",
  "blockchain": "Ethereum",
  "uri": "ethereum:0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC@1?value=660720000000000",
  "hint": "Use this data to create a transaction and sign it. Send the signed transaction back as HEX via the endpoint https://api.dfx.swiss/v1/lnurlp/tx/plp_f1ba466e2f1c0a4e. We check the transferred HEX and broadcast the transaction to the blockchain."
}

// Monero, Zano, Solana, Tron and Cardano
{
  "expiryDate": "2025-05-01T14:34:40.881Z",
  "blockchain": "Cardano",
  "uri": "cardano:addr1qyqjzchnayplhgueg33gukpp2max9gkge4gh6jly93a0dzcm67tl9f0pkykty8my4j4hg8e9suj8nzdrjygmfy6c8d0skmaq5q?amount=4.883112",
  "hint": "Use this data to create a transaction and sign it. Broadcast the signed transaction to the blockchain and send the transaction hash back via the endpoint https://api.dfx.swiss/v1/lnurlp/tx/plp_f1ba466e2f1c0a4e"
}

// Internet Computer (ICP)
{
  "expiryDate": "2025-05-01T14:34:40.881Z",
  "blockchain": "InternetComputer",
  "uri": "icp:6bf47-...-cai?amount=0.08415",
  "hint": "Approve the address from the URI for the required amount plus transfer fee using icrc2_approve. Then send your Principal ID as the sender parameter via the endpoint https://api.dfx.swiss/v1/lnurlp/tx/plp_f1ba466e2f1c0a4e."
}

// Lightning
{
  "pr": "lnbc12590n1p5p8p66pp5eh5manf8yj39ktlfm7h9y4uzph0wjnt6ngu2c709s9z5wndrfxkshp5kyucf7yxx97e0axrwke7xdy599csdhy67jd5pysz2n3m4d636cgqcqzzsxqzgvsp5wl7m20pwux8p49cumznt2vk3p6x08h0vshnpf2ckqzkwfw6fjdms9qyyssqy4mtye0fekxpgcjftmtqqre43xewmnsu94xmkq4yr8yfuj8se4ynd57s3etcdt3qwrrzx9x2qfm0kpz6kj9wy6ys328znrdvsq6mzrcpw0nfqs"
}

// BinancePay
{
  "expiryDate": "2025-05-01T14:34:40.881Z",
  "uri": "bnc://app.binance.com/payment/secpay?tempToken=IzjFLlGOoHAdeUth9FurNGjONDeI5Hq9",
  "hint": "Pay in the Binance app by following the deep link bnc://app.binance.com/payment/secpay?tempToken=IzjFLlGOoHAdeUth9FurNGjONDeI5Hq9."
}
```

Please note that the transaction details received belong to the quote from [step 2](#2-payment-details) and have the same expiration date.

### 4. Crypto Transaction

The transaction details received in [step 3](#3-transaction-details) should now be used to construct the blockchain transaction. This process depends on the selected method.
Please make sure to use a transaction fee higher or equal to the minimum fee specified in the `minFee` field (gas price in WEI for EVM chains, sat/vB for Bitcoin) for the specific payment method (in JSON from [step 2](#2-payment-details)).
The API URL to send the transaction proof back to the payment provider (see below) can be constructed by using the callback URL from [step 3](#3-transaction-details) and replacing `/cb` with `/tx`.

**Important:** All transaction submission endpoints require the following query parameters:
- `quote`: The quote ID from [step 2](#2-payment-details)
- `method`: The blockchain/payment method name (must match exactly the method name from the `transferAmounts` array, e.g., "Ethereum", "BinanceSmartChain", "Polygon", etc.)
- For EVM, Bitcoin and Firo: `hex` — the raw signed transaction in hexadecimal format
- For Monero, Zano, Solana, Tron and Cardano: `tx` — the transaction hash after broadcasting
- For Internet Computer: `asset` — the asset name (e.g. "ICP", "ckBTC", "ckUSDC") and either `sender` (Principal ID, for ICRC-2 approve flow) or `tx` (transaction ID, for direct transfer)
- For Lightning and BinancePay: no transaction submission needed (handled differently)

#### EVM, Bitcoin and Firo

Use the `uri` field from [step 3](#3-transaction-details) to construct and sign a valid transaction. Do not broadcast the transaction but send the raw signed transaction HEX to the payment provider with a GET HTTP request to the URL specified above. You must include the `quote` ID from [step 2](#2-payment-details) and the `method` parameter (blockchain name) in the request. If the call returns a success HTTP code, the Open CryptoPay payment has been successfully completed.

Note that BinanceSmartChain uses the `ethereum:` URI scheme (EIP-681 format with chain ID 56).

In our example the URL would be https://api.dfx.swiss/v1/lnurlp/tx/plp_f1ba466e2f1c0a4e?quote={quote-id}&method={selected-method}&hex={raw-tx-hex}.

Further examples:
- Ethereum payment: https://api.dfx.swiss/v1/lnurlp/tx/plp_f1ba466e2f1c0a4e?quote=plq_9af8927afe14f2d0&method=Ethereum&hex={raw-tx-hex}.
- BNB Smart Chain payment: https://api.dfx.swiss/v1/lnurlp/tx/plp_f1ba466e2f1c0a4e?quote=plq_9af8927afe14f2d0&method=BinanceSmartChain&hex={raw-tx-hex}.
- Firo payment: https://api.dfx.swiss/v1/lnurlp/tx/plp_f1ba466e2f1c0a4e?quote=plq_9af8927afe14f2d0&method=Firo&hex={raw-tx-hex}.

#### Monero, Zano, Solana, Tron and Cardano

Use the `uri` field from [step 3](#3-transaction-details) to construct a valid transaction. Broadcast the signed transaction to the blockchain yourself and then send the resulting transaction hash to the payment provider with a GET HTTP request to the URL specified above. You must include the `quote` ID from [step 2](#2-payment-details) and the `method` parameter in the request. If the call returns a success HTTP code, the Open CryptoPay payment has been successfully completed.

The URL format is `{tx-url}?quote={quote-id}&method={method}&tx={tx-hash}`.

In our example the URL would be https://api.dfx.swiss/v1/lnurlp/tx/plp_f1ba466e2f1c0a4e?quote=plq_9af8927afe14f2d0&method=Cardano&tx={tx-hash}.

#### Internet Computer (ICP)

The Internet Computer supports two payment flows:

**Option A: ICRC-2 Approve (recommended)**

1. Parse the `uri` field from [step 3](#3-transaction-details) to extract the payment provider's Principal (the address directly after `icp:`) and the amount.
2. Call `icrc2_approve` on the token canister, approving the payment provider's Principal for the required amount plus the transfer fee.
3. Send your Principal ID to the payment provider with a GET HTTP request to the URL specified above, using the `sender` parameter instead of `hex` or `tx`.

In our example the URL would be https://api.dfx.swiss/v1/lnurlp/tx/plp_f1ba466e2f1c0a4e?quote={quote-id}&method=InternetComputer&asset=ICP&sender={principal-id}.

The payment provider will then execute `icrc2_transfer_from` to pull the approved amount. If the call returns a success HTTP code, the payment has been successfully completed.

**Option B: Direct Transfer (TxId)**

Alternatively, construct and broadcast a transfer transaction (ICP transfer or `icrc1_transfer` for ICRC-1 tokens) directly to the address specified in the `uri` field. Then send the transaction ID to the payment provider.

In our example the URL would be https://api.dfx.swiss/v1/lnurlp/tx/plp_f1ba466e2f1c0a4e?quote={quote-id}&method=InternetComputer&asset=ICP&tx={tx-id}.

#### Lightning

Use the invoice from the `pr` field from [step 3](#3-transaction-details) to execute the transaction. The Open CryptoPay payment will be completed as soon as the transaction has been successfully executed.

#### BinancePay

Use the deep link from the `uri` field from [step 3](#3-transaction-details) to open the Binance app. The payment will be completed within the Binance app.

### Simplified Flow

To simplify the process, steps 2 and 3 can be done with a single HTTP call by adding the `method` and `asset` query parameters to the API URL used to fetch the payment details (in [step 2](#2-payment-details)). This call will return the transaction details as shown in [step 3](#3-transaction-details) or an error code, if the selected method and asset are not available with the payment provider. The simplified flow can be used with both approaches described in [step 2](#2-payment-details).

In our example the URL would be https://api.dfx.swiss/v1/lnurlp/pl_beeddb41cd4b6d9e?method=Ethereum&asset=ETH or https://api.dfx.swiss/pl/?lightning=LNURL1DP68GURN8GHJ7CTSDYHXGENC9EEHW6TNWVHHVVF0D3H82UNVWQHHQMZLVFJK2ERYVG6RZCMYX33RVEPEV5YEJ9WT&method=Ethereum&asset=ETH.
