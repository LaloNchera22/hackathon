// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Registry {
    struct Document {
        bytes32 docHash;
        string cid;
        uint256 timestamp;
        uint256 proofOfWorkNonce;
        uint256 corroborationCount;
        bool zkCredentialFlag;
    }

    // Mapping from docHash to Document
    mapping(bytes32 => Document) public documents;

    // Events
    event DocumentRegistered(
        bytes32 indexed docHash,
        string cid,
        uint256 timestamp,
        uint256 proofOfWorkNonce,
        bool zkCredentialFlag,
        uint256 score
    );

    event DocumentCorroborated(
        bytes32 indexed docHash,
        uint256 newCorroborationCount,
        uint256 newScore
    );

    function registerDocument(
        bytes32 _docHash,
        string memory _cid,
        uint256 _proofOfWorkNonce,
        bool _zkCredentialFlag
    ) public {
        require(documents[_docHash].timestamp == 0, "Document already registered");

        uint256 initialCorroborationCount = 1;

        documents[_docHash] = Document({
            docHash: _docHash,
            cid: _cid,
            timestamp: block.timestamp,
            proofOfWorkNonce: _proofOfWorkNonce,
            corroborationCount: initialCorroborationCount,
            zkCredentialFlag: _zkCredentialFlag
        });

        emit DocumentRegistered(
            _docHash,
            _cid,
            block.timestamp,
            _proofOfWorkNonce,
            _zkCredentialFlag,
            calculateScore(_docHash)
        );
    }

    function corroborateDocument(bytes32 _docHash) public {
        require(documents[_docHash].timestamp != 0, "Document not registered");

        documents[_docHash].corroborationCount += 1;

        emit DocumentCorroborated(
            _docHash,
            documents[_docHash].corroborationCount,
            calculateScore(_docHash)
        );
    }

    function calculateScore(bytes32 _docHash) public view returns (uint256) {
        Document memory doc = documents[_docHash];
        if (doc.timestamp == 0) return 0;

        uint256 score = 0;

        // Base score for simply being registered with valid PoW
        score += 10;

        // Bonus for ZK credential
        if (doc.zkCredentialFlag) {
            score += 20;
        }

        // Bonus for corroborations (diminishing returns or cap can be implemented)
        score += (doc.corroborationCount * 15);

        if (score > 100) {
            score = 100;
        }

        return score;
    }
}
