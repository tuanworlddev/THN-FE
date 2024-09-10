import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {WebSocketService} from "../../services/web-socket.service";

@Component({
  selector: 'app-video-call',
  standalone: true,
  imports: [],
  templateUrl: './video-call.component.html',
  styleUrl: './video-call.component.css'
})
export class VideoCallComponent implements OnInit {
  @ViewChild('localVideo') localVideo?: ElementRef;
  @ViewChild('remoteVideo') remoteVideo?: ElementRef;

  countUser: number = 0;
  isStarted: boolean = false;
  isLoadingLocalVideo: boolean = true;
  isLoadingRemoteVideo: boolean = true;

  private peerConnection?: RTCPeerConnection;
  private localStream?: MediaStream;
  private receiverId?: string;

  rtcConfiguration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  };

  constructor(private webSocketService: WebSocketService) {
  }

  ngOnInit() {
    this.initializeLocalVideo().catch(error => console.error(error));
    this.handleMessages().catch(err => console.error(err));
  }

  async startCall() {
    this.isStarted = true;
    this.createPeerConnection().catch(error => console.error(error));
  }

  async nextCall() {
    this.webSocketService.sendMessage({ command: 'receiverNext', receiverId: this.receiverId, data: {} });
    await this.stopPeerConnection();
    this.createPeerConnection().catch(error => console.error(error));
  }

  async stopCall() {
    await this.stopPeerConnection();
    this.webSocketService.sendMessage({ command: 'stop', data: {} });
    this.webSocketService.sendMessage({ command: 'receiverStop', receiverId: this.receiverId, data: {} });

    this.isStarted = false;
    this.isLoadingRemoteVideo = true;
  }

  async initializeLocalVideo() {
    this.isLoadingLocalVideo = true;
    navigator.mediaDevices.getUserMedia({video: true, audio: true}).then(stream => {
      this.localStream = stream;
      this.localVideo!.nativeElement.srcObject = stream;
      this.isLoadingLocalVideo = false;
    })
  }

  async createPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.rtcConfiguration);

    this.localStream?.getTracks().forEach(track => this.peerConnection?.addTrack(track, this.localStream!));

    this.peerConnection.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.webSocketService.sendMessage({
          command: 'candidate',
          receiverId: this.receiverId,
          data: { type: 'candidate', candidate: candidate },
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      this.remoteVideo!.nativeElement.srcObject = event.streams[0];
      this.isLoadingRemoteVideo = false;
    };

    this.peerConnection.onconnectionstatechange = () => {
      const connectionState = this.peerConnection!.iceConnectionState;

      if (connectionState === 'disconnected' || connectionState === 'failed' || connectionState === 'closed') {
        console.log('Connection lost, stopping current call.');
        this.webSocketService.sendMessage({
          command: 'disconnect',
          receiverId: this.receiverId,
          data: {}
        });
        this.stopPeerConnection().then(() => {
          this.createPeerConnection().catch(error => console.error(error));
        });
      }
    };

    this.webSocketService.sendMessage({
      command: 'match',
      data: {}
    });

    this.isLoadingRemoteVideo = true;
  }

  async stopPeerConnection() {
    if (this.peerConnection) {
      this.remoteVideo!.nativeElement.srcObject = null;

      this.peerConnection.close();
      this.peerConnection = undefined;
      console.log('Call stopped and peer connection closed.');
    }
  }

  async handleMessages() {
    this.webSocketService.getMessages().subscribe(msg => {
      console.log(msg);
      if (msg.command === 'createOffer') {
        this.receiverId = msg.receiverId;
        this.createOffer().then(offer => {
          this.webSocketService.sendMessage({
            command: 'offer',
            receiverId: this.receiverId,
            data: { type: 'offer', sdp: offer.sdp }
          })
        })
      } else if (msg.command === 'offer') {
        this.setRemoteDescription(msg.data);
        this.createAnswer().then(answer => {
          this.webSocketService.sendMessage({
            command: 'answer',
            receiverId: this.receiverId,
            data: { type: 'answer', sdp: answer.sdp}
          });
        })
      } else if (msg.command === 'answer') {
        this.setRemoteDescription(msg.data);
      } else if (msg.command === 'candidate') {
        this.addIceCandidate(msg.data.candidate);
      } else if (msg.command === 'info') {
        this.receiverId = msg.receiverId;
      } else if (msg.command === 'countUser') {
        this.countUser = msg.count;
      } else if (msg.command === 'receiverNext') {
        this.stopPeerConnection().then(() => {
          console.log('Received "next" command, stopping current call.');
          this.createPeerConnection().catch(error => console.error(error));
        });
      } else if (msg.command === 'receiverStop') {
        this.stopPeerConnection().then(() => {
          console.log('Received "stop" command, stopping current call.');
          this.createPeerConnection().catch(error => console.error(error));
        });
      } else if (msg.command === 'disconnect') {
        this.stopPeerConnection().then(() => {
          console.log('Received "stop" command, stopping current call.');
          this.createPeerConnection().catch(error => console.error(error));
        });
      }
    });
  }

  async createOffer() {
    const offer = await this.peerConnection!.createOffer();
    this.peerConnection?.setLocalDescription(offer);
    return offer;
  }

  async setRemoteDescription(offer: any) {
    try {
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));
    } catch (error) {
      console.error('Failed to set remote description:', error);
    }
  }

  async createAnswer() {
    const answer = await this.peerConnection!.createAnswer();
    await this.peerConnection!.setLocalDescription(answer);
    return answer;
  }

  async addIceCandidate(candidate: any) {
    try {
      await this.peerConnection!.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Failed to add ICE candidate:', error);
    }
  }

}
