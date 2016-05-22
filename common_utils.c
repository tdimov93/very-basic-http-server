/*
 * =====================================================================================
 *
 *       Filename:  common_utils.c
 *
 *    Description: util functions used by the server and the client
 *
 *        Version:  1.0
 *        Created:  2016-05-02 09:20:00
 *       Revision:  none
 *       Compiler:  cc
 *
 *         Author: DIMOV Theodor, DRAGOMIR Philippe
 *
 * =====================================================================================
 */
#include <unistd.h>
#include "common_utils.h"


void send_prepared_msg(const char* pmsg, int socket) {
	if (send(socket, pmsg, strlen(pmsg), 0) == -1) {
		perror("Send");
		exit(EXIT_FAILURE);
	}
}

void send_msg(int msg_code, const char* payload, int socket) {
	char msg[MESSAGE_SIZE];
	sprintf(msg, "%d %s", msg_code, payload);
	send_prepared_msg(msg, socket);
}

void send_light_msg(int msg_code, int socket) {
	char msg[MESSAGE_SIZE];
	sprintf(msg, "%d", msg_code);
	send_prepared_msg(msg, socket);
}

void send_int_msg(int msg_code, int payload, int socket) {
	char msg[MESSAGE_SIZE];
	sprintf(msg, "%d %d", msg_code, payload);
	send_prepared_msg(msg, socket);
}

char* extract_req_method(char** msg) {
	return strtok_r(*msg, " \t", msg);
}

char* extract_req_path(char** msg) {
	//get rid of spaces and/or tabs
	char* token;
	do {
		token = strtok_r(*msg, " \t", msg);
	} while (!strcmp(token, " ") || !strcmp(token, "\t"));
	return token;
}

int decode_msg_payload(char** raw_payload, int* decoded_payload, int max_elements) {
	int i;
	for (i = 0; i < max_elements; i++) {
		char* token = strtok_r(*raw_payload, " ", raw_payload );
		if (token == NULL) {
			return i;
		}
		*(decoded_payload + i) = atoi(token);
	}
	return i;
}

