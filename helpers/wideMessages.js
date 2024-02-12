const ethereumSignInMessage = `By signing this message I hereby acknowledge and agree to authenticate with the WIDE client using my Ethereum address. I am aware that this process does not involve sharing private keys.

I have consented to the Terms and Conditions of the Software, which I will abide by. I am aware that Ethereum address is used for authentication purposes and may be shared with third parties.

Thank you for using our service. Proceed to sign the message for accessing WIDE.`;

const ethereumTermsOfServiceMessage = `By signing this message, I acknowledge and agree to the following Terms and Conditions:

**Disclaimer for the Use of WIDE Facilitating Personal Data Presentations to Third Parties**

By using https://wid3.app and https://wid3-demo.app (hereinafter referred to as "the Software"), developed and made available by the WIDE Consortium and its associated entities (hereinafter referred to as “the Developers and Contributors”) designed to facilitate the presentation of personal data to third parties, I acknowledge and agree to the following:

1. I understand and accept that I am solely responsible for the personal data I choose to present using the Software. This includes but is not limited to ensuring the legality, accuracy, and appropriateness of the data shared.
2. I agree to comply with all relevant laws, regulations, and industry standards governing the collection, processing, and sharing of personal data, including but not limited to data protection and privacy laws.
3. I warrant that I have obtained all necessary consents, authorisations, and permissions required to present and share any personal data using the Software. I further acknowledge that I am solely responsible for obtaining any additional consents or authorisations necessary from individuals whose personal data I share.
4. I acknowledge that the Developers and Contributors of the Software shall not be liable for any damages, losses, or liabilities arising from my use of the Software, including but not limited to any unauthorised access, use, or disclosure of personal data.
5. I agree to indemnify, defend, and hold harmless the Developers and Contributors of the Software from any claims, damages, losses, liabilities, or expenses (including legal fees) arising out of or related to my use of the Software or any breach of this disclaimer.
6. The Software is provided "as is," without any warranty or guarantee of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. I acknowledge that the Developers and Contributors of the Software make no representations or warranties regarding the accuracy, reliability, or performance of the Software.
7. I acknowledge that the use of the Software involves certain risks, including but not limited to the potential exposure of personal data to unauthorised third parties. I agree to use the Software at my own risk and take appropriate measures to mitigate any potential risks. I acknowledge that the Software is at a prototype stage and should not be used with sensitive data. I understand that it may contain bugs, errors, or vulnerabilities that could compromise the security or integrity of the data. Therefore, I agree not to use the Software with sensitive or confidential data until it has been thoroughly tested and deemed suitable for such use.
8. I agree and guarantee not to manually alter, manipulate, or fake data using the Software. I understand that doing so could lead to inaccurate or misleading presentations, and I accept full responsibility for maintaining the integrity of the data presented. I understand that the Developers and Contributors of the Software reserve the right to modify, suspend, or terminate the Software at any time without prior notice. I agree that they shall not be liable to me or any third party for any such modification, suspension, or termination.

By signing with my private key or by using the Software, I confirm that I have the full power and authority to enter into the Terms and Conditions and that I am of legal age according to the laws applicable to me.`

const historyKeyMessage = `By signing this message, I, holder of Ethereum address {{ethAddress}}, hereby consent to WIDE storing my credential presentation history. I understand and agree that the signature generated from this message shall be shared exclusively with the Software and shall not be disclosed to any third party. 

I am aware that by sharing this signature I am altering the intended functionality of the Software and found in breach of the Terms and Conditions, which I am held responsible for.

I acknowledge that my Ethereum wallet address will be associated with my credential presentation history for authentication purposes within the Software.

I am consenting to these terms freely and I have the legal authority to provide such consent.`

module.exports = {
    ethereumSignInMessage,
    ethereumTermsOfServiceMessage,
    historyKeyMessage
};