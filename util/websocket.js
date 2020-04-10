const crypto=require('crypto')
module.exports.getSecWebSocketAccept = function (secWebsocketKey){
    return crypto.createHash('sha1')
    .update(`${secWebsocketKey}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest('base64');
}
    /**
     *   0                   1                   2                   3
         0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
                       1               2               3               4
         0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7
        +-+-+-+-+-------+-+-------------+-------------------------------+
        |F|R|R|R| opcode|M| Payload len |    Extended payload length    |
        |I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
        |N|V|V|V|       |S|             |   (if payload len==126/127)   |
        | |1|2|3|       |K|             |                               |
        +-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
        |     Extended payload length continued, if payload len == 127  |
        + - - - - - - - - - - - - - - - +-------------------------------+
        |                               |Masking-key, if MASK set to 1  |
        +-------------------------------+-------------------------------+
        | Masking-key (continued)       |          Payload Data         |
        +-------------------------------- - - - - - - - - - - - - - - - +
        :                     Payload Data continued ...                :
        + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
        |                     Payload Data continued ...                |
        +---------------------------------------------------------------+
     */
module.exports.decodeSocketFrame = function (bufData){
    let bufIndex = 0
    const byte1 = bufData.readUInt8(bufIndex++).toString(2)
    const byte2 = bufData.readUInt8(bufIndex++).toString(2)
    const frame =  {
        fin:parseInt(byte1.substring(0,1),2),
        // RSV是保留字段，暂时不计算
        opcode:parseInt(byte1.substring(4,8),2),
        mask:parseInt(byte2.substring(0,1),2),
        payloadLen:parseInt(byte2.substring(1,8),2),
    }
    // 如果frame.payloadLen为126或127说明这个长度不够了，要使用扩展长度了
    // 如果frame.payloadLen为126，则使用Extended payload length同时为16/8字节数
    // 如果frame.payloadLen为127，则使用Extended payload length同时为64/8字节数
    // 注意payloadLen得长度单位是字节(bytes)而不是比特(bit)
    if(frame.payloadLen==126) {
        frame.payloadLen = bufData.readUIntBE(bufIndex,2);
        bufIndex+=2;
    } else if(frame.payloadLen==127) {
        // 虽然是8字节，但是前四字节目前留空，因为int型是4字节不留空int会溢出
        bufIndex+=4;
        frame.payloadLen = bufData.readUIntBE(bufIndex,4);
        bufIndex+=4;
    }
    if(frame.mask){
        const payloadBufList = []
        // maskingKey为4字节数据
        frame.maskingKey=[bufData[bufIndex++],bufData[bufIndex++],bufData[bufIndex++],bufData[bufIndex++]];
        for(let i=0;i<frame.payloadLen;i++) {
            payloadBufList.push(bufData[bufIndex+i]^frame.maskingKey[i%4]);
        }
        frame.payloadBuf = Buffer.from(payloadBufList)
    } else {
        frame.payloadBuf = bufData.slice(bufIndex,bufIndex+frame.payloadLen)
    }
    return frame
}
module.exports.encodeSocketFrame = function (frame){
    const frameBufList = [];
    // 对fin位移七位则为10000000加opcode为10000001
    const header = (frame.fin<<7)+frame.opcode;
    frameBufList.push(header)
    const bufBits = Buffer.byteLength(frame.payloadBuf);
    let payloadLen = bufBits;
    let extBuf;
    if(bufBits>=126) {
        //65536是2**16即两字节数字极限
        if(bufBits>=65536) {
            extBuf = Buffer.allocUnsafe(8);
            extBuf.writeUInt32BE(bufBits, 4);
            payloadLen = 127;
        } else {
            extBuf = Buffer.allocUnsafe(2);
            extBuf.writeUInt16BE(bufBits, 0);
            payloadLen = 126;
        }
    }
    let payloadLenBinStr = payloadLen.toString(2);
    while(payloadLenBinStr.length<8){payloadLenBinStr='0'+payloadLenBinStr;}
    frameBufList.push(parseInt(payloadLenBinStr,2));
    if(bufBits>=126) {
        frameBufList.push(...extBuf);
    }
    frameBufList.push(...frame.payloadBuf)
    return Buffer.from(frameBufList)
}