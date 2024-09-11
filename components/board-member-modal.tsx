"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PlusCircle, UserCircle } from "lucide-react"

type Member = {
  id: string
  name: string
  email: string
  role: "Viewer" | "Editor" | "Admin"
}

export function BoardMemberModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [newMember, setNewMember] = useState({ name: "", email: "" })
  const [members, setMembers] = useState<Member[]>([
    { id: "1", name: "John Doe", email: "john@example.com", role: "Admin" },
    { id: "2", name: "Jane Smith", email: "jane@example.com", role: "Editor" },
  ])

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault()
    if (newMember.name && newMember.email) {
      setMembers([
        ...members,
        { ...newMember, id: Date.now().toString(), role: "Viewer" },
      ])
      setNewMember({ name: "", email: "" })
    }
  }

  const handleRoleChange = (memberId: string, newRole: Member["role"]) => {
    setMembers(
      members.map((member) =>
        member.id === memberId ? { ...member, role: newRole } : member
      )
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Manage Board Members</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Board Members</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <form onSubmit={handleAddMember} className="grid gap-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newMember.name}
                onChange={(e) =>
                  setNewMember({ ...newMember, name: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={newMember.email}
                onChange={(e) =>
                  setNewMember({ ...newMember, email: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <Button type="submit" className="ml-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </form>
          <div className="mt-6">
            <h4 className="mb-4 text-sm font-medium">Current Members</h4>
            {members.map((member) => (
              <div key={member.id} className="flex items-center space-x-4 mb-4">
                <UserCircle className="h-6 w-6" />
                <div className="flex-grow">
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
                <Select
                  value={member.role}
                  onValueChange={(value: Member["role"]) =>
                    handleRoleChange(member.id, value)
                  }
                >
                  <SelectTrigger className="w-[110px]">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Viewer">Viewer</SelectItem>
                    <SelectItem value="Editor">Editor</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}