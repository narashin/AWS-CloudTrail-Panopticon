'use strict';
const AWS = require('aws-sdk');
const { IncomingWebhook } = require('@slack/webhook');

module.exports.panopticon = async (event, context, callback) => {
    const eventEg = {
        "eventVersion": "1.05",
        "userIdentity": {
            "type": "IAMUser",
            "principalId": "AIDAJP7VI4FOQ4LU3XSKA",
            "arn": "arn:aws:iam::158142683155:user/nara@mz.co.kr",
            "accountId": "158142683155",
            "accessKeyId": "ASIASJUQJ3AJYT5ZEEEL",
            "userName": "nara@mz.co.kr",
            "sessionContext": {
                "sessionIssuer": {},
                "webIdFederationData": {},
                "attributes": {
                    "mfaAuthenticated": "true",
                    "creationDate": "2020-06-17T05:45:33Z"
                }
            }
        },
        "eventTime": "2020-06-17T06:45:43Z",
        "eventSource": "ec2.amazonaws.com",
        "eventName": "AuthorizeSecurityGroupIngress",
        "awsRegion": "ap-northeast-2",
        "sourceIPAddress": "221.148.35.240",
        "userAgent": "console.ec2.amazonaws.com",
        "requestParameters": {
            "groupId": "sg-007c4cf0863811b58",
            "ipPermissions": {
                "items": [
                    {
                        "ipProtocol": "tcp",
                        "fromPort": 6290,
                        "toPort": 6290,
                        "groups": {},
                        "ipRanges": {
                            "items": [
                                {
                                    "cidrIp": "0.0.0.0/16",
                                    "description": "6290-add1"
                                }
                            ]
                        },
                        "ipv6Ranges": {},
                        "prefixListIds": {}
                    },
                    {
                        "ipProtocol": "tcp",
                        "fromPort": 9062,
                        "toPort": 9062,
                        "groups": {},
                        "ipRanges": {
                            "items": [
                                {
                                    "cidrIp": "0.0.0.0/32",
                                    "description": "9062-add2"
                                }
                            ]
                        },
                        "ipv6Ranges": {},
                        "prefixListIds": {}
                    }
                ]
            }
        },
        "responseElements": {
            "requestId": "39825599-744f-4df6-be94-5a3e8efc5663",
            "_return": true
        },
        "requestID": "39825599-744f-4df6-be94-5a3e8efc5663",
        "eventID": "83292173-2287-4fd0-8887-8087936027f9",
        "eventType": "AwsApiCall",
        "recipientAccountId": "158142683155"
    }
    const webhook = new IncomingWebhook(process.env.SLACK_URL);
    // const webhook = new IncomingWebhook('https://hooks.slack.com/services/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');
    const ec2 = new AWS.EC2();
    let eventInfo = {
        "eventName": eventEg.eventName,
        "eventTime": eventEg.eventTime,
        "accountId": eventEg.userIdentity.accountId,
        "userName": eventEg.userIdentity.userName,
        "sourceIp": eventEg.sourceIPAddress,
        "awsRegion": eventEg.awsRegion,
        "sgId": eventEg.requestParameters.groupId,
        "ipPermissions": eventEg.requestParameters.ipPermissions.items
    }

    // async function findSecurityGroup(){
    //     let resp = await ec2.describeSecurityGroups(
    //         {
    //             GroupIds: [
    //                 eventInfo.sgId
    //             ]
    //         }, function (err, data){
    //             if(err) console.log(err, err.stack);
    //             else return data;
    //         }
    //     ).promise();
    //     return resp;
    // }

    function formatMessage(eventName){
        let thumbnailImage = '';
        let eventNameDetail = '';
        let emoji = '';
        let ipList = [];
        const createImage = 'https://img.icons8.com/color/48/000000/new-by-copy.png';
        const editImage = 'https://img.icons8.com/color/48/000000/edit-property.png';
        const deleteImage = 'https://img.icons8.com/color/48/000000/delete-property.png';

        switch(eventName){
            case 'CreateSecurityGroup': 
                thumbnailImage = createImage; 
                eventNameDetail = '보안그룹 생성';
                break;
            case 'DeleteSecurityGroup': 
                thumbnailImage = deleteImage; 
                eventNameDetail = '보안그룹 삭제';
                break;
            case 'AuthorizeSecurityGroupEgress':
            case 'AuthorizeSecurityGroupIngress':
                thumbnailImage = editImage;
                eventNameDetail = '보안그룹 IP 상세 수정';
                emoji = ':white_check_mark:';
                break;
            case 'RevokeSecurityGroupEgress':
            case 'RevokeSecurityGroupIngress': 
                thumbnailImage = editImage; 
                emoji = ':x:';
                eventNameDetail = '보안그룹 IP 상세 수정';
                break;
        };

        for(let item in eventInfo.ipPermissions){
            console.log(eventInfo.ipPermissions[item]);
            ipList = {
                        "type": "plain_text",
                        "text": `Protocol : ${eventInfo.ipPermissions[item].ipProtocol}\nIP : ${item.fromPort} - ${item.toPort}\nDescription : 어쩌구`,
                        "emoji": true
                     }
        }

        let slackText = {
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `:robot_face: SecurityGroup 변경 사항 발생 *(${eventInfo.eventName})*`
                    }
                },
                
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `*EventName :*\n${eventInfo.eventName}\n(${eventNameDetail})\n*Account Id :*\n${eventInfo.accountId}\n*EventTime :*\n${eventInfo.eventTime}\n*Source IP :*\n${eventInfo.sourceIp}  \n*User Name :*\n ${eventInfo.userName}\n*AWS Region :*\n${eventInfo.awsRegion}\n*Security Group ID :*\n${eventInfo.sgId}`
                    },
                    "accessory": {
                        "type": "image",
                        "image_url": `${thumbnailImage}`,
                        "alt_text": "status thumbnail"
                    }
                    
                },
                {
                    "type": "divider"
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*Security Group Ip Permissions*"
                    },
                    "fields": [
                        ipList
                    ]
                    
                }
            ]
        }

        return slackText;
        
    }


    (async() => {
        // const sg = await findSecurityGroup(); 
        const message = await formatMessage(eventInfo.eventName);
        await webhook.send(message);

    })();

}
