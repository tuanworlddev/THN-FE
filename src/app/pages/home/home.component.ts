import { Component } from '@angular/core';
import {NavbarComponent} from "../../components/navbar/navbar.component";
import {VideoCallComponent} from "../video-call/video-call.component";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NavbarComponent, VideoCallComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {

}
