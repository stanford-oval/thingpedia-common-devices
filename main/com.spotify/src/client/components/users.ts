import { UserObject } from "../../api/objects";
import { Component } from "..";

export class Users extends Component {
    me(): Promise<UserObject> {
        return this._api.users.me();
    }
}
